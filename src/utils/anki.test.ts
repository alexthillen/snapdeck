import { describe, expect, it, vi } from 'vitest'
import { addCardToDeck, createBasicCard, createDeck } from './anki'

vi.mock('../lib/sql', () => ({ createDatabase: vi.fn() }))

describe('Anki export', () => {
  it('keeps source and chapter tags on generated notes', () => {
    const deck = createDeck('Study')
    const note = createBasicCard('Question', 'Answer')
    addCardToDeck(deck, note, ['source::Book', 'chapter::One'])

    expect(note.tags).toEqual(['source::Book', 'chapter::One'])
    expect(deck.notes).toEqual([note])
  })
})
