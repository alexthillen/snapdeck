import { describe, expect, it } from 'vitest'

import { AnkiParser, ParserError } from './ankiParser'

const BASIC_CARD = `FRONT: What is 2+2?
BACK: 4
EXTRA: Adds up quickly.
DIFFICULTY: 1/10
TAGS: Math::Arithmetic`

const CLOZE_CARD = `FRONT: The capital of {{c1::France}} is {{c1::Paris}}.
EXTRA: Remember the Seine river.
DIFFICULTY: 3/10
TAGS: Geography::Europe`

describe('AnkiParser', () => {
  it('parses a basic card', () => {
    const parser = new AnkiParser()
    const card = parser.parseCard(BASIC_CARD)
    expect(card.cardType).toBe('BASIC')
    expect(card.front).toContain('What is 2+2')
    expect(card.back).toBe('4')
    expect(card.extra).toContain('Adds up quickly')
    expect(card.tags).toEqual(['Math::Arithmetic'])
  })

  it('parses a cloze card', () => {
    const parser = new AnkiParser()
    const card = parser.parseCard(CLOZE_CARD)
    expect(card.cardType).toBe('CLOZE')
    expect(card.back).toBeNull()
    expect(card.front).toContain('{{c1::France}}')
  })

  it('throws on inconsistent cloze definition', () => {
    const parser = new AnkiParser()
    const invalid = `FRONT: {{c1::Broken}} card
BACK: Should not exist
DIFFICULTY: 7/10`

    expect(() => parser.parseCard(invalid)).toThrow(ParserError)
  })

  it('escapes HTML entities in every field', () => {
    const parser = new AnkiParser()
    const htmlCard = `FRONT: <b>Danger</b>
BACK: <script>alert('x')</script>
EXTRA: <div>text</div>
DIFFICULTY: 2/10`

    const card = parser.parseCard(htmlCard)
    expect(card.front).toContain('&lt;b&gt;Danger')
    expect(card.back).toContain('&lt;script&gt;')
    expect(card.extra).toContain('&lt;div&gt;')
  })

  it('parses multiple cards from a single response', () => {
    const parser = new AnkiParser()
    const response = `${BASIC_CARD}\n\n${CLOZE_CARD}`

    const { cards, errors } = parser.parseResponse(response)
    expect(errors).toHaveLength(0)
    expect(cards).toHaveLength(2)
    expect(cards[0].cardType).toBe('BASIC')
    expect(cards[1].cardType).toBe('CLOZE')
  })

  it('collects issues during bulk parsing', () => {
    const parser = new AnkiParser()
    const invalidCard = 'This is not a card'
    const { cards, errors } = parser.parseResponse(
      `${BASIC_CARD}\n\n${invalidCard}`,
    )

    expect(cards).toHaveLength(1)
    expect(errors).toHaveLength(1)
    expect(errors[0].index).toBe(1)
  })
})
