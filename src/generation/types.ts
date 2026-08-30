import type { ParsedCard, ParserIssue } from '../lib/parsers'
import type { GenerationUnit, PageRange } from '../documents/types'

export type DraftCard = ParsedCard & {
  id: string
  included: boolean
  documentTitle: string
  sectionTitle: string
  sectionPath: string[]
  pageRange: PageRange
}

export type UnitRun = {
  unit: GenerationUnit
  sectionTitle: string
  documentTitle: string
  status: 'pending' | 'running' | 'succeeded' | 'needs-review' | 'failed'
  cards: DraftCard[]
  parseIssues: ParserIssue[]
  rawResponse?: string
  error?: string
}
