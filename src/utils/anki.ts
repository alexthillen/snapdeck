import { BasicCardModel } from '../models/anki/basic'
import { ClozeCardModel } from '../models/anki/cloze'
import { Deck, Package } from 'genanki-js'
import { createDatabase } from '../lib/sql'
import type { DraftCard } from '../generation/types'

type DeckNote = {
  tags: string[] | null
}

type DeckInstance = InstanceType<typeof Deck> & {
  notes: DeckNote[]
  addNote: (note: DeckNote) => void
}

export function createDeck(deckName: string) {
  const deckId = Math.floor(Math.random() * 1e10) // Generate a random deck ID
  return new Deck(deckId, deckName) as DeckInstance
}

export function addCardToDeck(
  deck: DeckInstance,
  card: DeckNote,
  tags: string[] = [],
) {
  card.tags = tags
  deck.addNote(card)
}

export function createBasicCard(
  front: string,
  back: string,
  extra: string = '',
  difficulty: string = '',
): DeckNote {
  return BasicCardModel.note([front, back, extra, difficulty]) as DeckNote
}

export function createClozeCard(
  text: string,
  backExtra: string = '',
  difficulty: string = '',
): DeckNote {
  return ClozeCardModel.note([text, backExtra, difficulty]) as DeckNote
}

export function saveDeckToFile(deck: DeckInstance, filename: string) {
  const packageApkg = new Package()
  packageApkg.setSqlJs(createDatabase())
  packageApkg.addDeck(deck)
  console.log(packageApkg)
  return packageApkg.writeToFile(filename)
}

export function exportDraftCards(deckName: string, cards: DraftCard[]) {
  const deck = createDeck(deckName)
  cards.filter(card => card.included).forEach(card => {
    const note =
      card.cardType === 'BASIC'
        ? createBasicCard(
            card.front,
            card.back ?? '',
            card.extra ?? '',
            card.difficulty,
          )
        : createClozeCard(card.front, card.extra ?? '', card.difficulty)
    addCardToDeck(deck, note, card.tags)
  })
  const filename = `${deckName.trim().replace(/\s+/g, '_')}.apkg`
  return saveDeckToFile(deck, filename)
}
