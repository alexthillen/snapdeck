import { BasicCardModel } from '../models/anki/basic'
import { ClozeCardModel } from '../models/anki/cloze'
import { Deck, Package } from 'genanki-js'
import { createDatabase } from '../lib/sql-direct'

export function createDeck(deckName: string) {
  const deckId = Math.floor(Math.random() * 1e10) // Generate a random deck ID
  return new Deck(deckId, deckName)
}

export function addCardToDeck(deck: any, card: any, tags: string[] = []) {
  deck.addNote(card, tags)
}

export function createBasicCard(
  front: string,
  back: string,
  extra: string = '',
  difficulty: string = '',
) {
  return BasicCardModel.note([front, back, extra, difficulty])
}

export function createClozeCard(
  text: string,
  backExtra: string = '',
  difficulty: string = '',
) {
  return ClozeCardModel.note([text, backExtra, difficulty])
}

export function saveDeckToFile(deck: any, filename: string) {
  const packageApkg = new Package()
  packageApkg.setSqlJs(createDatabase())
  packageApkg.addDeck(deck)
  console.log(packageApkg)
  return packageApkg.writeToFile(filename)
}
