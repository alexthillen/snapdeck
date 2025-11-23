export type CardType = 'BASIC' | 'CLOZE'

export interface ParsedCard {
  cardType: CardType
  front: string
  back: string | null
  extra: string | null
  difficulty: string
  tags: string[]
}

export interface ParserIssue {
  index: number
  block: string
  error: Error
}

export interface ParseResponseResult {
  cards: ParsedCard[]
  errors: ParserIssue[]
}

export interface ParseResponseOptions {
  failFast?: boolean
  onError?: (issue: ParserIssue) => void
}
