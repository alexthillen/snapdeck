import { Deck, Note, Package, type Notetype } from 'ankipack'
import { saveAs } from 'file-saver'
import type { SqlJsStatic } from 'sql.js'
import { BasicCardNotetype } from '../models/anki/basic'
import { ClozeCardNotetype } from '../models/anki/cloze'
import type { DraftCard } from '../generation/types'
import { getSqlJs } from '../lib/sql'
import { normaliseAnkiTag } from './ankiTags'

const includedCards = (cards: DraftCard[]) => cards.filter(card => card.included)
const CLOZE_DELETION = /\{\{c[1-9]\d*::[\s\S]*?\}\}/i

const fieldsForCard = (card: DraftCard): string[] => card.cardType === 'BASIC'
  ? [card.front, card.back ?? '', card.extra ?? '', card.difficulty]
  : [card.front, card.extra ?? '', card.difficulty]

const notetypeForCard = (card: DraftCard): Notetype => card.cardType === 'BASIC'
  ? BasicCardNotetype
  : ClozeCardNotetype

const tagsForCard = (card: DraftCard): string[] => [...new Set(
  card.tags
    .map(normaliseAnkiTag)
    .filter((tag): tag is string => Boolean(tag)),
)]

const guidForCard = (card: DraftCard): string => {
  const value = [card.cardType, ...fieldsForCard(card)].join('\u001f')
  let hash = 0xcbf29ce484222325n

  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }

  return hash.toString(36)
}

export async function createAnkiPackage(
  deckName: string,
  cards: DraftCard[],
  SQL: SqlJsStatic,
): Promise<Uint8Array> {
  const name = deckName.trim()
  const cardsToExport = includedCards(cards)
  if (!name) throw new Error('Enter a deck name before exporting.')
  if (!cardsToExport.length) throw new Error('Include at least one card before exporting.')

  const deck = new Deck({ name, config: null })

  cardsToExport.forEach(card => {
    if (!card.front.trim()) throw new Error('Every exported card needs content on its front.')
    if (card.cardType === 'CLOZE' && !CLOZE_DELETION.test(card.front)) {
      throw new Error('Every Cloze card needs at least one complete {{c1::deletion}}.')
    }
    deck.addNote(new Note({
      notetype: notetypeForCard(card),
      fields: fieldsForCard(card),
      tags: tagsForCard(card),
      guid: guidForCard(card),
    }))
  })

  const ankiPackage = new Package()
  ankiPackage.addDeck(deck)
  return ankiPackage.toUint8Array(SQL)
}

export async function exportDraftCards(deckName: string, cards: DraftCard[]): Promise<void> {
  const name = deckName.trim()
  const bytes = await createAnkiPackage(name, cards, await getSqlJs())
  const filename = `${name.replace(/\s+/g, '_')}.apkg`
  saveAs(new Blob([new Uint8Array(bytes)], { type: 'application/apkg' }), filename)
}
