import type { AnalyzedDocument, CoverageLevel, GenerationPlan, GenerationUnit, PlannedSection } from '../documents/types'
import type { CardType } from '../lib/parsers'
import type { LlmConfig } from '../utils/llm/config'
import { renderPdfPages } from '../utils/llm/document'
import { generateCards } from '../utils/llm/api'
import { parseLlmResponse } from '../utils/llm/parser'
import { buildPrompt } from '../utils/llm/prompts'
import type { DraftCard, UnitRun } from './types'

type RunOptions = {
  plan: GenerationPlan
  documents: AnalyzedDocument[]
  config: LlmConfig
  cardType: CardType
  coverage: CoverageLevel
  onUpdate?: (runs: UnitRun[]) => void
}

const tagPart = (value: string): string =>
  value
    .trim()
    .replace(/::/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '') || 'untitled'

const withProvenance = (
  cards: ReturnType<typeof parseLlmResponse>['cards'],
  unit: GenerationUnit,
  section: PlannedSection,
): DraftCard[] => {
  const sourceTag = `source::${tagPart(section.documentTitle)}`
  const chapterTag = `chapter::${section.path.map(tagPart).join('::')}`
  return cards.map((card, index) => ({
    ...card,
    id: `${unit.id}-card-${index + 1}`,
    tags: [...new Set([...card.tags, sourceTag, chapterTag])],
    included: true,
    documentTitle: section.documentTitle,
    sectionTitle: section.title,
    sectionPath: section.path,
    pageRange: unit.range,
  }))
}

export const createPendingRuns = (plan: GenerationPlan): UnitRun[] =>
  plan.sections
    .filter(section => section.included)
    .flatMap(section =>
      section.units.map(unit => ({
        unit,
        sectionTitle: section.title,
        documentTitle: section.documentTitle,
        status: 'pending' as const,
        cards: [],
        parseIssues: [],
      })),
    )

export const runGenerationUnit = async ({
  unit,
  section,
  document,
  config,
  cardType,
  coverage,
}: {
  unit: GenerationUnit
  section: PlannedSection
  document: AnalyzedDocument
  config: LlmConfig
  cardType: CardType
  coverage: CoverageLevel
}): Promise<UnitRun> => {
  try {
    const pages = await renderPdfPages(document, unit.range)
    const prompt = await buildPrompt(cardType, {
      targetCards: unit.targetCards,
      sectionTitle: `${document.title} — ${section.path.join(' › ')}`,
      coverage,
    })
    const response = await generateCards({ config, pages, prompt })
    const parsed = parseLlmResponse(response.text)
    const cards = withProvenance(parsed.cards, unit, section)
    if (!cards.length) {
      throw new Error('The model returned no parseable cards for this section.')
    }
    return {
      unit,
      sectionTitle: section.title,
      documentTitle: section.documentTitle,
      status: parsed.errors.length ? 'needs-review' : 'succeeded',
      cards,
      parseIssues: parsed.errors,
      rawResponse: response.text,
    }
  } catch (error) {
    return {
      unit,
      sectionTitle: section.title,
      documentTitle: section.documentTitle,
      status: 'failed',
      cards: [],
      parseIssues: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export const runGeneration = async ({
  plan,
  documents,
  config,
  cardType,
  coverage,
  onUpdate,
}: RunOptions): Promise<UnitRun[]> => {
  const runs = createPendingRuns(plan)
  const sections = new Map(plan.sections.map(section => [section.id, section]))
  const documentById = new Map(documents.map(document => [document.id, document]))

  for (let index = 0; index < runs.length; index += 1) {
    const current = runs[index]
    current.status = 'running'
    onUpdate?.([...runs])

    const section = sections.get(current.unit.sectionId)
    const document = documentById.get(current.unit.documentId)
    if (!section || !document) {
      runs[index] = {
        ...current,
        status: 'failed',
        error: 'The planned source document is no longer available.',
      }
    } else {
      runs[index] = await runGenerationUnit({
        unit: current.unit,
        section,
        document,
        config,
        cardType,
        coverage,
      })
    }
    onUpdate?.([...runs])
  }

  return runs
}
