import { describe, expect, it } from 'vitest'
import { createGenerationPlan } from './plan'
import type { AnalyzedDocument } from './types'

const document = (overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument => ({
  id: 'doc-1',
  file: new File(['pdf'], 'book.pdf', { type: 'application/pdf' }),
  fileName: 'book.pdf',
  title: 'Book',
  pageCount: 6,
  pages: Array.from({ length: 6 }, (_, pageIndex) => ({
    pageIndex,
    text: `Page ${pageIndex + 1}`,
    estimatedTokens: 500,
  })),
  outline: [],
  ...overrides,
})

describe('createGenerationPlan', () => {
  it('uses chapter and subchapter boundaries without losing pages', () => {
    const plan = createGenerationPlan(
      [
        document({
          outline: [
            {
              id: 'chapter-1',
              title: 'Chapter 1',
              pageIndex: 1,
              children: [
                {
                  id: 'section-1-1',
                  title: 'Section 1.1',
                  pageIndex: 3,
                  children: [],
                },
              ],
            },
            {
              id: 'chapter-2',
              title: 'Chapter 2',
              pageIndex: 5,
              children: [],
            },
          ],
        }),
      ],
      { includeSubchapters: true, coverage: 'balanced', contextTokens: 32_768 },
    )

    expect(plan.sections.map(section => [section.title, section.range])).toEqual([
      ['Front matter', { start: 0, end: 1 }],
      ['Chapter 1', { start: 1, end: 3 }],
      ['Section 1.1', { start: 3, end: 5 }],
      ['Chapter 2', { start: 5, end: 6 }],
    ])
    expect(plan.includedPages).toBe(6)
    expect(plan.totalPages).toBe(6)
  })

  it('collapses subchapters when requested', () => {
    const plan = createGenerationPlan(
      [
        document({
          outline: [
            {
              id: 'chapter-1',
              title: 'Chapter 1',
              pageIndex: 0,
              children: [
                {
                  id: 'section-1-1',
                  title: 'Section 1.1',
                  pageIndex: 2,
                  children: [],
                },
              ],
            },
            {
              id: 'chapter-2',
              title: 'Chapter 2',
              pageIndex: 4,
              children: [],
            },
          ],
        }),
      ],
      { includeSubchapters: false, coverage: 'balanced', contextTokens: 32_768 },
    )

    expect(plan.sections.map(section => [section.title, section.range])).toEqual([
      ['Chapter 1', { start: 0, end: 4 }],
      ['Chapter 2', { start: 4, end: 6 }],
    ])
  })

  it('falls back to context-safe contiguous chunks and derives card targets', () => {
    const plan = createGenerationPlan(
      [document({ pages: document().pages.map(page => ({ ...page, estimatedTokens: 3_000 })) })],
      { includeSubchapters: true, coverage: 'balanced', contextTokens: 16_000 },
    )

    expect(plan.sections.map(section => section.range)).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 2 },
      { start: 2, end: 3 },
      { start: 3, end: 4 },
      { start: 4, end: 5 },
      { start: 5, end: 6 },
    ])
    expect(plan.totalTargetCards).toBeGreaterThan(6)
    expect(plan.totalCalls).toBe(6)
  })

  it('keeps excluded pages explicit in the plan totals', () => {
    const initial = createGenerationPlan(
      [document()],
      { includeSubchapters: true, coverage: 'balanced', contextTokens: 32_768 },
    )
    const excludedId = initial.sections[0].id
    const plan = createGenerationPlan(
      [document()],
      {
        includeSubchapters: true,
        coverage: 'balanced',
        contextTokens: 32_768,
        excludedSectionIds: new Set([excludedId]),
      },
    )

    expect(plan.sections[0].included).toBe(false)
    expect(plan.includedPages).toBe(0)
    expect(plan.totalTargetCards).toBe(0)
  })
})
