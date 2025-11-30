import { MathParser } from './mathParser'
import type {
  ParseResponseOptions,
  ParseResponseResult,
  ParsedCard,
  ParserIssue,
} from './types'

const CLOZE_SYNTAX = /\{\{c\d+::/i
const CARD_BODY =
  String.raw`FRONT:\s*(?<front>[\s\S]*?)` +
  String.raw`(?=\r?\n\s*(?:BACK:|EXTRA:|DIFFICULTY:)|$)` +
  String.raw`(?:\r?\nBACK:\s*(?<back>[\s\S]*?)` +
  String.raw`(?=\r?\n\s*(?:EXTRA:|DIFFICULTY:)|$))?` +
  String.raw`(?:\r?\nEXTRA:\s*(?<extra>[\s\S]*?)` +
  String.raw`(?=\r?\n\s*DIFFICULTY:|$))?` +
  String.raw`\r?\nDIFFICULTY:\s*(?<difficulty>\d+(?:\.\d+)?)\/10` +
  String.raw`(?:\s*\r?\nTAGS:\s*(?<tags>[^\r\n]*))?`

const CARD_PATTERN = new RegExp(String.raw`^${CARD_BODY}\s*$`, 'ims')
const CARD_BLOCK_PATTERN = new RegExp(CARD_BODY, 'gims')

export class ParserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParserError'
  }
}

export class AnkiParser {
  private readonly mathParser: MathParser

  constructor({ processBraces = true }: { processBraces?: boolean } = {}) {
    this.mathParser = new MathParser({ processBraces })
  }

  parseResponse(
    text: string,
    options?: ParseResponseOptions,
  ): ParseResponseResult {
    const blocks = this.splitIntoCardBlocks(text)
    const cards: ParsedCard[] = []
    const errors: ParserIssue[] = []
    const failFast = options?.failFast ?? false

    blocks.forEach((block, index) => {
      try {
        cards.push(this.parseCard(block))
      } catch (error) {
        const issue: ParserIssue = {
          index,
          block: block.trim(),
          error:
            error instanceof Error ? error : new ParserError(String(error)),
        }
        options?.onError?.(issue)
        errors.push(issue)
        if (failFast) {
          throw issue.error
        }
      }
    })

    return { cards, errors }
  }

  parseCard(rawText: string): ParsedCard {
    const trimmed = rawText.trim()
    const match = CARD_PATTERN.exec(trimmed)
    CARD_PATTERN.lastIndex = 0

    if (!match || !match.groups?.front || !match.groups?.difficulty) {
      throw new ParserError(
        'Could not parse Anki card content. Ensure it follows the expected format.',
      )
    }

    const frontRaw = match.groups.front
    const backRaw = match.groups.back
    const extraRaw = match.groups.extra
    const difficultyRaw = match.groups.difficulty
    const tagsRaw = match.groups.tags ?? ''

    const front = this.mathParser.reconstructAnkiMath(
      this.sanitiseMultiline(frontRaw),
    )
    const backContent = backRaw
      ? this.mathParser.reconstructAnkiMath(this.sanitiseMultiline(backRaw))
      : null
    const extra = extraRaw
      ? this.mathParser.reconstructAnkiMath(this.sanitiseMultiline(extraRaw))
      : null

    const hasClozeSyntax = CLOZE_SYNTAX.test(frontRaw)
    const missingBack = backRaw == null
    if (hasClozeSyntax !== missingBack) {
      throw new ParserError(
        "Inconsistent cloze card format: 'back' presence must match cloze syntax on the front.",
      )
    }

    const difficulty = `${difficultyRaw}/10`
    const tags = tagsRaw
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)

    const cardType = missingBack ? 'CLOZE' : 'BASIC'

    return {
      cardType,
      front: this.escapeHtmlTables(front),
      back: backContent ? this.escapeHtmlTables(backContent) : null,
      extra: extra ? this.escapeHtmlTables(extra) : null,
      difficulty,
      tags,
    }
  }

  escapeHtmlTables(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  private sanitiseMultiline(value: string): string {
    return value.replace(/\r/g, '').trim()
  }

  private splitIntoCardBlocks(text: string): string[] {
    const normalised = (text ?? '').replace(/\r/g, '')
    const trimmed = normalised.trim()
    if (!trimmed) {
      return []
    }

    const blocks: string[] = []
    let cursor = normalised.indexOf(trimmed)
    if (cursor === -1) {
      cursor = 0
    }

    for (const match of normalised.matchAll(CARD_BLOCK_PATTERN)) {
      const start = match.index ?? 0
      const blockStart = Math.max(start, cursor)

      if (blockStart > cursor) {
        const between = normalised.slice(cursor, blockStart).trim()
        if (between) {
          blocks.push(between)
        }
      }

      const cardSlice = normalised
        .slice(blockStart, blockStart + match[0].length)
        .trim()
      if (cardSlice) {
        blocks.push(cardSlice)
      }
      cursor = blockStart + match[0].length
    }

    const tail = normalised.slice(cursor).trim()
    if (tail) {
      blocks.push(tail)
    }

    return blocks
  }
}
