import { Collection } from 'ankipack'
import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import type { DraftCard } from '../generation/types'
import { createAnkiPackage } from './anki'

const draftCard = (overrides: Partial<DraftCard> = {}): DraftCard => ({
  id: 'unit-1-card-1',
  unitId: 'unit-1',
  included: true,
  cardType: 'BASIC',
  front: 'Question',
  back: 'Answer',
  extra: 'Context',
  difficulty: '4/10',
  tags: ['source::Book Name', 'chapter::Part One'],
  documentTitle: 'Book Name',
  sectionTitle: 'Part One',
  sectionPath: ['Part One'],
  pageRange: { start: 0, end: 1 },
  ...overrides,
})

describe('Anki export', () => {
  it('writes a readable package with Basic and multi-deletion Cloze cards', async () => {
    const SQL = await initSqlJs()
    const bytes = await createAnkiPackage('Study', [
      draftCard(),
      draftCard({
        id: 'unit-1-card-2',
        cardType: 'CLOZE',
        front: '{{c1::Virtual memory}} maps addresses; {{c2::paging}} moves blocks.',
        back: null,
        extra: 'Two independently reviewed deletions.',
        tags: ['source::Book Name', 'topic with spaces'],
      }),
      draftCard({ id: 'excluded', included: false }),
    ], SQL)

    const collection = Collection.open(bytes, SQL)
    const basic = collection.notes({ notetype: 'SnapDeck : Basic' })
    const cloze = collection.notes({ notetype: 'SnapDeck : Cloze' })

    expect(collection.deckNames()).toEqual(['Study'])
    expect(basic).toHaveLength(1)
    expect(basic[0].fieldNames).toEqual(['Front', 'Back', 'Extra', 'Difficulty'])
    expect(basic[0].fields).toEqual(['Question', 'Answer', 'Context', '4/10'])
    expect(basic[0].tags).toEqual(['source::book_name', 'chapter::part_one'])
    expect(cloze).toHaveLength(1)
    expect(cloze[0].fieldNames).toEqual(['Text', 'Back Extra', 'Difficulty'])
    expect(cloze[0].tags).toEqual(['source::book_name', 'topic_with_spaces'])
    expect(collection.data.cards).toHaveLength(3)
    expect(collection.data.cards.map(card => card.ord).sort()).toEqual([0, 0, 1])
    expect(collection.data.notetypes.map(notetype => notetype.id).sort()).toEqual([
      1276888190,
      1276888191,
    ])
  })

  it('rejects malformed cloze syntax before producing an empty card', async () => {
    const SQL = await initSqlJs()

    await expect(createAnkiPackage('Study', [draftCard({
      cardType: 'CLOZE',
      front: 'No cloze deletion here',
      back: null,
    })], SQL)).rejects.toThrow()
  })

  it('keeps note identities stable across repeat exports', async () => {
    const SQL = await initSqlJs()
    const cards = [draftCard()]

    const first = Collection.open(await createAnkiPackage('Study', cards, SQL), SQL)
    const second = Collection.open(await createAnkiPackage('Study', cards, SQL), SQL)

    expect(first.data.notes[0].guid).toBe(second.data.notes[0].guid)
  })
})
