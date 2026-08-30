import type { DraftCard } from '../generation/types'

const CLOZE = /\{\{c\d+::([\s\S]*?)(?:::(.*?))?\}\}/g

export const renderClozeSide = (text: string, reveal: boolean): string =>
  text.replace(CLOZE, (_match, answer: string, hint: string | undefined) =>
    reveal ? `**${answer}**` : `**[${hint?.trim() || '…'}]**`,
  )

export const cardPreview = (
  card: DraftCard,
  side: 'front' | 'back',
): { primary: string; extra: string | null } => {
  if (card.cardType === 'BASIC') {
    return side === 'front'
      ? { primary: card.front, extra: null }
      : { primary: card.back ?? '', extra: card.extra }
  }

  return {
    primary: renderClozeSide(card.front, side === 'back'),
    extra: side === 'back' ? card.extra : null,
  }
}
