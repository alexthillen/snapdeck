import { describe, expect, it, vi } from 'vitest'
import { createPendingRuns, runGeneration } from './runGeneration'
import type { AnalyzedDocument, GenerationPlan } from '../documents/types'

vi.mock('../utils/llm/document', () => ({
  renderPdfPages: vi.fn(async (_document, range) => [
    { pageNumber: range.start + 1, text: 'Source', imageUrl: 'data:image/jpeg;base64,x' },
  ]),
}))

vi.mock('../utils/llm/prompts', () => ({
  buildPrompt: vi.fn(async () => 'Prompt'),
}))

const responses = vi.hoisted(() => ({ generate: vi.fn() }))
vi.mock('../utils/llm/api', () => ({ generateCards: responses.generate }))

const unit = (id: string, sectionId: string) => ({
  id,
  sectionId,
  documentId: 'doc',
  range: { start: 0, end: 1 },
  estimatedInputTokens: 2_000,
  targetCards: 1,
})

const plan: GenerationPlan = {
  sections: [
    {
      id: 'section-1',
      documentId: 'doc',
      documentTitle: 'Book',
      title: 'One',
      path: ['One'],
      range: { start: 0, end: 1 },
      included: true,
      targetCards: 1,
      units: [unit('unit-1', 'section-1')],
    },
    {
      id: 'section-2',
      documentId: 'doc',
      documentTitle: 'Book',
      title: 'Two',
      path: ['Two'],
      range: { start: 1, end: 2 },
      included: true,
      targetCards: 1,
      units: [unit('unit-2', 'section-2')],
    },
  ],
  totalPages: 2,
  includedPages: 2,
  totalTargetCards: 2,
  totalCalls: 2,
  warnings: [],
}

const document: AnalyzedDocument = {
  id: 'doc',
  file: new File(['pdf'], 'book.pdf', { type: 'application/pdf' }),
  fileName: 'book.pdf',
  title: 'Book',
  pageCount: 2,
  pages: [
    { pageIndex: 0, text: 'One', estimatedTokens: 1 },
    { pageIndex: 1, text: 'Two', estimatedTokens: 1 },
  ],
  outline: [],
}

describe('generation orchestration', () => {
  it('creates one pending run per included unit', () => {
    expect(createPendingRuns(plan).map(run => run.unit.id)).toEqual(['unit-1', 'unit-2'])
  })

  it('continues after one failed section and retains successful cards', async () => {
    responses.generate
      .mockRejectedValueOnce(new Error('Context exceeded'))
      .mockResolvedValueOnce({
        text: 'FRONT:\nQuestion?\nBACK:\nAnswer.\nEXTRA:\nMore.\nDIFFICULTY: 5/10\nTAGS: Topic',
        raw: {},
      })

    const runs = await runGeneration({
      plan,
      documents: [document],
      config: {
        provider: 'openai-compatible',
        apiKey: '',
        baseUrl: 'http://localhost/v1',
        model: 'model',
      },
      cardType: 'BASIC',
      coverage: 'balanced',
    })

    expect(runs.map(run => run.status)).toEqual(['failed', 'succeeded'])
    expect(runs[1].cards).toHaveLength(1)
    expect(runs[1].cards[0].tags).toContain('source::Book')
    expect(runs[1].cards[0].tags).toContain('chapter::Two')
  })
})
