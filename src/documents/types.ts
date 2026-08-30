export type CoverageLevel = 'concise' | 'balanced' | 'thorough'

export type PageRange = {
  start: number
  end: number
}

export type PdfOutlineNode = {
  id: string
  title: string
  pageIndex: number
  children: PdfOutlineNode[]
}

export type AnalyzedPage = {
  pageIndex: number
  text: string
  estimatedTokens: number
}

export type AnalyzedDocument = {
  id: string
  file: File
  fileName: string
  title: string
  pageCount: number
  pages: AnalyzedPage[]
  outline: PdfOutlineNode[]
}

export type PlannedSection = {
  id: string
  documentId: string
  documentTitle: string
  title: string
  path: string[]
  range: PageRange
  included: boolean
  targetCards: number
  units: GenerationUnit[]
}

export type GenerationUnit = {
  id: string
  sectionId: string
  documentId: string
  range: PageRange
  estimatedInputTokens: number
  targetCards: number
  textOverrides?: Array<{
    pageIndex: number
    text: string
  }>
}

export type GenerationPlan = {
  sections: PlannedSection[]
  totalPages: number
  includedPages: number
  totalTargetCards: number
  totalCalls: number
  warnings: string[]
}

export type PlanOptions = {
  includeSubchapters: boolean
  coverage: CoverageLevel
  contextTokens: number
  excludedSectionIds?: Set<string>
}
