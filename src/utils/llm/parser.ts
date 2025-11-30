import { AnkiParser, type ParseResponseResult } from '../../lib/parsers'

const parser = new AnkiParser()

export const parseLlmResponse = (raw: string): ParseResponseResult =>
  parser.parseResponse(raw)
