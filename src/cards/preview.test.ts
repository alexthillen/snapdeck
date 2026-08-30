import { describe, expect, it } from 'vitest'
import { cardPreview, renderClozeSide } from './preview'
import type { DraftCard } from '../generation/types'

const clozeCard: DraftCard = {
  id: 'card-1',
  unitId: 'unit-1',
  cardType: 'CLOZE',
  front: 'The capital is {{c1::Bern::city}} and $x^2$.',
  back: null,
  extra: 'A **concise** explanation.',
  difficulty: '4/10',
  tags: ['chapter::One'],
  included: true,
  documentTitle: 'Book',
  sectionTitle: 'One',
  sectionPath: ['One'],
  pageRange: { start: 0, end: 1 },
}

describe('card preview fixtures', () => {
  it('shows cloze hints on the front and answers on the back', () => {
    expect(renderClozeSide(clozeCard.front, false)).toContain('**[city]**')
    expect(renderClozeSide(clozeCard.front, true)).toContain('**Bern**')
  })

  it('keeps extra markdown on the answer side', () => {
    expect(cardPreview(clozeCard, 'front').extra).toBeNull()
    expect(cardPreview(clozeCard, 'back')).toMatchObject({
      primary: expect.stringContaining('Bern'),
      extra: 'A **concise** explanation.',
    })
  })
})
