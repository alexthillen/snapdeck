import { BasicCardModel } from '../models/anki/basic'
import { ClozeCardModel } from '../models/anki/cloze'
import { Deck, Package } from 'genanki-js'
import { createDatabase } from '../lib/sql-direct'

type DeckInstance = InstanceType<typeof Deck>
type DeckNote = Parameters<DeckInstance['addNote']>[0]

export function createDeck(deckName: string) {
  const deckId = Math.floor(Math.random() * 1e10) // Generate a random deck ID
  return new Deck(deckId, deckName)
}

export function addCardToDeck(
  deck: DeckInstance,
  card: DeckNote,
  tags: string[] = [],
) {
  deck.addNote(card, tags)
}

export function createBasicCard(
  front: string,
  back: string,
  extra: string = '',
  difficulty: string = '',
): DeckNote {
  return BasicCardModel.note([front, back, extra, difficulty])
}

export function createClozeCard(
  text: string,
  backExtra: string = '',
  difficulty: string = '',
): DeckNote {
  return ClozeCardModel.note([text, backExtra, difficulty])
}

export function saveDeckToFile(deck: DeckInstance, filename: string) {
  const packageApkg = new Package()
  packageApkg.setSqlJs(createDatabase())
  packageApkg.addDeck(deck)
  console.log(packageApkg)
  return packageApkg.writeToFile(filename)
}
