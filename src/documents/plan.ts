import type {
  AnalyzedDocument,
  CoverageLevel,
  GenerationPlan,
  GenerationUnit,
  PageRange,
  PdfOutlineNode,
  PlanOptions,
  PlannedSection,
} from './types'

const IMAGE_INPUT_TOKENS_PER_PAGE = 1_800
const IMAGE_CONTENT_TOKENS_PER_PAGE = 250
const INPUT_BUDGET_RATIO = 0.55
const MAX_PAGES_PER_UNIT = 8

const TOKENS_PER_CARD: Record<CoverageLevel, number> = {
  concise: 900,
  balanced: 600,
  thorough: 350,
}

type SectionBoundary = {
  id: string
  title: string
  path: string[]
  pageIndex: number
}

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section'

const flattenOutline = (
  nodes: PdfOutlineNode[],
  includeSubchapters: boolean,
  parents: string[] = [],
  depth = 0,
): SectionBoundary[] =>
  nodes.flatMap(node => {
    const path = [...parents, node.title]
    const own =
      depth === 0 || includeSubchapters
        ? [{ id: node.id, title: node.title, path, pageIndex: node.pageIndex }]
        : []
    const children = includeSubchapters
      ? flattenOutline(node.children, true, path, depth + 1)
      : []
    return [...own, ...children]
  })

const pageInputTokens = (document: AnalyzedDocument, pageIndex: number): number =>
  document.pages[pageIndex].estimatedTokens + IMAGE_INPUT_TOKENS_PER_PAGE

const targetCards = (textTokens: number, pageCount: number, coverage: CoverageLevel): number => {
  const content = textTokens + pageCount * IMAGE_CONTENT_TOKENS_PER_PAGE
  return Math.max(1, Math.ceil(content / TOKENS_PER_CARD[coverage]))
}

const splitPageText = (text: string, maxTokens: number): string[] => {
  const maxCharacters = Math.max(1, maxTokens * 4)
  const chunks: string[] = []
  let remaining = text.trim()

  while (remaining.length > maxCharacters) {
    const minimumBreak = Math.floor(maxCharacters * 0.6)
    const candidate = remaining.slice(0, maxCharacters + 1)
    const newline = candidate.lastIndexOf('\n')
    const space = candidate.lastIndexOf(' ')
    const splitAt = Math.max(newline, space, minimumBreak)
    chunks.push(remaining.slice(0, splitAt).trim())
    remaining = remaining.slice(splitAt).trim()
  }

  if (remaining) chunks.push(remaining)
  return chunks.length ? chunks : ['']
}

const splitRange = (
  document: AnalyzedDocument,
  sectionId: string,
  range: PageRange,
  coverage: CoverageLevel,
  contextTokens: number,
): GenerationUnit[] => {
  const inputBudget = Math.floor(contextTokens * INPUT_BUDGET_RATIO)
  const units: Array<{
    range: PageRange
    estimatedInputTokens: number
    textTokens: number
    textOverrides?: GenerationUnit['textOverrides']
  }> = []
  let start = range.start
  let tokens = 0

  const addRange = (end: number) => {
    if (start >= end) return
    const pages = document.pages.slice(start, end)
    units.push({
      range: { start, end },
      estimatedInputTokens: pages.reduce(
        (total, page) => total + page.estimatedTokens + IMAGE_INPUT_TOKENS_PER_PAGE,
        0,
      ),
      textTokens: pages.reduce((total, page) => total + page.estimatedTokens, 0),
    })
  }

  for (let pageIndex = range.start; pageIndex < range.end; pageIndex += 1) {
    const nextTokens = pageInputTokens(document, pageIndex)
    if (nextTokens > inputBudget) {
      addRange(pageIndex)
      const page = document.pages[pageIndex]
      const maxTextTokens = Math.max(1, inputBudget - IMAGE_INPUT_TOKENS_PER_PAGE)
      splitPageText(page.text, maxTextTokens).forEach(text => {
        const textTokens = Math.ceil(text.length / 4)
        units.push({
          range: { start: pageIndex, end: pageIndex + 1 },
          estimatedInputTokens: textTokens + IMAGE_INPUT_TOKENS_PER_PAGE,
          textTokens,
          textOverrides: [{ pageIndex, text }],
        })
      })
      start = pageIndex + 1
      tokens = 0
      continue
    }

    const pagesInUnit = pageIndex - start
    if (
      pagesInUnit > 0 &&
      (tokens + nextTokens > inputBudget || pagesInUnit >= MAX_PAGES_PER_UNIT)
    ) {
      addRange(pageIndex)
      start = pageIndex
      tokens = 0
    }
    tokens += nextTokens
  }

  if (start < range.end) {
    addRange(range.end)
  }

  return units.map((unit, index) => ({
    id: `${sectionId}-unit-${index + 1}`,
    sectionId,
    documentId: document.id,
    range: unit.range,
    estimatedInputTokens: unit.estimatedInputTokens,
    targetCards: targetCards(unit.textTokens, unit.range.end - unit.range.start, coverage),
    textOverrides: unit.textOverrides,
  }))
}

const outlineSections = (
  document: AnalyzedDocument,
  includeSubchapters: boolean,
): Array<Omit<PlannedSection, 'included' | 'targetCards' | 'units'>> => {
  const boundaries = flattenOutline(document.outline, includeSubchapters)
    .filter(boundary => boundary.pageIndex >= 0 && boundary.pageIndex < document.pageCount)
    .sort((left, right) => left.pageIndex - right.pageIndex)

  if (!boundaries.length) {
    return []
  }

  const sections: Array<Omit<PlannedSection, 'included' | 'targetCards' | 'units'>> = []
  if (boundaries[0].pageIndex > 0) {
    sections.push({
      id: `${document.id}-front-matter`,
      documentId: document.id,
      documentTitle: document.title,
      title: 'Front matter',
      path: ['Front matter'],
      range: { start: 0, end: boundaries[0].pageIndex },
    })
  }

  boundaries.forEach((boundary, index) => {
    const nextPage = boundaries[index + 1]?.pageIndex ?? document.pageCount
    if (nextPage <= boundary.pageIndex) {
      return
    }
    sections.push({
      id: `${document.id}-${slug(boundary.id)}`,
      documentId: document.id,
      documentTitle: document.title,
      title: boundary.title,
      path: boundary.path,
      range: { start: boundary.pageIndex, end: nextPage },
    })
  })

  return sections
}

const fallbackSections = (
  document: AnalyzedDocument,
  contextTokens: number,
): Array<Omit<PlannedSection, 'included' | 'targetCards' | 'units'>> => {
  const inputBudget = Math.floor(contextTokens * INPUT_BUDGET_RATIO)
  const ranges: PageRange[] = []
  let start = 0
  let tokens = 0

  for (let pageIndex = 0; pageIndex < document.pageCount; pageIndex += 1) {
    const nextTokens = pageInputTokens(document, pageIndex)
    const pagesInSection = pageIndex - start
    if (
      pagesInSection > 0 &&
      (tokens + nextTokens > inputBudget || pagesInSection >= MAX_PAGES_PER_UNIT)
    ) {
      ranges.push({ start, end: pageIndex })
      start = pageIndex
      tokens = 0
    }
    tokens += nextTokens
  }
  if (start < document.pageCount) {
    ranges.push({ start, end: document.pageCount })
  }

  return ranges.map((range, index) => ({
    id: `${document.id}-pages-${range.start + 1}-${range.end}`,
    documentId: document.id,
    documentTitle: document.title,
    title: `Pages ${range.start + 1}–${range.end}`,
    path: [`Part ${index + 1}`],
    range,
  }))
}

export const createGenerationPlan = (
  documents: AnalyzedDocument[],
  options: PlanOptions,
): GenerationPlan => {
  const excluded = options.excludedSectionIds ?? new Set<string>()
  const sections = documents.flatMap(document => {
    const outlined = outlineSections(document, options.includeSubchapters)
    const candidates = outlined.length > 0
      ? outlined
      : fallbackSections(document, options.contextTokens)

    return candidates.map(section => {
      const included = !excluded.has(section.id)
      const units = included
        ? splitRange(
            document,
            section.id,
            section.range,
            options.coverage,
            options.contextTokens,
          )
        : []
      return {
        ...section,
        included,
        targetCards: units.reduce((total, unit) => total + unit.targetCards, 0),
        units,
      }
    })
  })

  const totalPages = documents.reduce((total, document) => total + document.pageCount, 0)
  const includedPages = sections
    .filter(section => section.included)
    .reduce((total, section) => total + section.range.end - section.range.start, 0)
  const includedSections = sections.filter(section => section.included)

  return {
    sections,
    totalPages,
    includedPages,
    totalTargetCards: includedSections.reduce(
      (total, section) => total + section.targetCards,
      0,
    ),
    totalCalls: includedSections.reduce(
      (total, section) => total + section.units.length,
      0,
    ),
    warnings: [
      'Image-token cost is estimated conservatively; actual model usage may differ.',
    ],
  }
}
