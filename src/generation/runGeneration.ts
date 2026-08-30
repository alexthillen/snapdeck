import type { AnalyzedDocument, CoverageLevel, GenerationPlan, GenerationUnit, PlannedSection } from '../documents/types'
import type { CardType } from '../lib/parsers'
import type { LlmConfig } from '../utils/llm/config'
import {
  createPdfRenderSession,
  renderPdfPages,
  type PdfPageInput,
  type PdfRenderSession,
} from '../utils/llm/document'
import { generateCards } from '../utils/llm/api'
import { parseLlmResponse } from '../utils/llm/parser'
import { buildPrompt } from '../utils/llm/prompts'
import { normaliseSemanticTag, normaliseTagPart } from '../utils/ankiTags'
import { GenerationController } from './control'
import type { DraftCard, UnitRun } from './types'

type RunOptions = {
  plan: GenerationPlan
  documents: AnalyzedDocument[]
  config: LlmConfig
  cardType: CardType
  coverage: CoverageLevel
  onUpdate?: (runs: UnitRun[]) => void
  initialRuns?: UnitRun[]
  controller?: GenerationController
}

const withProvenance = (
  cards: ReturnType<typeof parseLlmResponse>['cards'],
  unit: GenerationUnit,
  section: PlannedSection,
): DraftCard[] => {
  const sourceTag = `source::${normaliseTagPart(section.documentTitle)}`
  const chapterTag = `chapter::${section.path.map(normaliseTagPart).join('::')}`
  return cards.map((card, index) => {
    const semanticTags = card.tags
      .map(normaliseSemanticTag)
      .filter((tag): tag is string => Boolean(tag))
      .filter(tag => !tag.startsWith('source::') && !tag.startsWith('chapter::'))
      .slice(0, 3)

    return {
      ...card,
      id: `${unit.id}-card-${index + 1}`,
      unitId: unit.id,
      tags: [...new Set([...semanticTags, sourceTag, chapterTag])],
      included: true,
      documentTitle: section.documentTitle,
      sectionTitle: section.title,
      sectionPath: section.path,
      pageRange: unit.range,
    }
  })
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
        generatedCards: 0,
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
  signal,
  onProgress,
  renderPages = renderPdfPages,
}: {
  unit: GenerationUnit
  section: PlannedSection
  document: AnalyzedDocument
  config: LlmConfig
  cardType: CardType
  coverage: CoverageLevel
  signal?: AbortSignal
  onProgress?: (generatedCards: number) => void
  renderPages?: (
    document: AnalyzedDocument,
    range: GenerationUnit['range'],
    signal?: AbortSignal,
  ) => Promise<PdfPageInput[]>
}): Promise<UnitRun> => {
  try {
    const overrides = new Map(
      unit.textOverrides?.map(override => [override.pageIndex, override.text]) ?? [],
    )
    const pages = (await renderPages(document, unit.range, signal)).map(page => ({
      ...page,
      text: overrides.get(page.pageNumber - 1) ?? page.text,
    }))
    const prompt = await buildPrompt(cardType, {
      targetCards: unit.targetCards,
      sectionTitle: `${document.title} — ${section.path.join(' › ')}`,
      coverage,
    })
    let reportedCards = 0
    const response = await generateCards({
      config,
      pages,
      prompt,
      signal,
      onText: config.provider === 'openai-compatible'
        ? text => {
            const generatedCards = parseLlmResponse(text).cards.length
            if (generatedCards !== reportedCards) {
              reportedCards = generatedCards
              onProgress?.(generatedCards)
            }
          }
        : undefined,
    })
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
      generatedCards: cards.length,
      parseIssues: parsed.errors,
      rawResponse: response.text,
    }
  } catch (error) {
    const stopped = signal?.aborted ?? false
    return {
      unit,
      sectionTitle: section.title,
      documentTitle: section.documentTitle,
      status: stopped ? 'stopped' : 'failed',
      cards: [],
      generatedCards: 0,
      parseIssues: [],
      error: stopped
        ? undefined
        : error instanceof Error ? error.message : String(error),
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
  initialRuns,
  controller = new GenerationController(),
}: RunOptions): Promise<UnitRun[]> => {
  const runs = initialRuns
    ? initialRuns.map(run => ({ ...run, cards: [...run.cards], parseIssues: [...run.parseIssues] }))
    : createPendingRuns(plan)
  const sections = new Map(plan.sections.map(section => [section.id, section]))
  const documentById = new Map(documents.map(document => [document.id, document]))
  const renderSessions = new Map<string, PdfRenderSession>()

  const renderPages = async (
    document: AnalyzedDocument,
    range: GenerationUnit['range'],
    signal?: AbortSignal,
  ) => {
    let session = renderSessions.get(document.id)
    if (!session) {
      session = await createPdfRenderSession(document, signal)
      renderSessions.set(document.id, session)
    }
    return session.render(range, signal)
  }

  try {
    for (let index = 0; index < runs.length; index += 1) {
      const current = runs[index]
      if (current.status !== 'pending') continue

      if (
        controller.shouldStopAll() ||
        controller.shouldStopSection(current.unit.sectionId)
      ) {
        runs[index] = {
          ...current,
          status: 'stopped',
          generatedCards: 0,
          stopReason: controller.stopReason(current.unit.sectionId),
        }
        onUpdate?.([...runs])
        continue
      }

      current.status = 'running'
      current.generatedCards = 0
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
        const signal = controller.startUnit(current.unit.sectionId)
        runs[index] = await runGenerationUnit({
          unit: current.unit,
          section,
          document,
          config,
          cardType,
          coverage,
          signal,
          renderPages,
          onProgress: generatedCards => {
            runs[index] = { ...runs[index], generatedCards }
            onUpdate?.([...runs])
          },
        })
        if (runs[index].status === 'stopped') {
          runs[index].stopReason = controller.stopReason(current.unit.sectionId)
        }
        controller.finishUnit()
      }
      onUpdate?.([...runs])
    }
  } finally {
    await Promise.all(Array.from(renderSessions.values(), session => session.destroy()))
  }

  return runs
}
