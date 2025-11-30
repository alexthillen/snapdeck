export const ExprKinds = {
  INLINE: 'inline',
  DISPLAY: 'display',
} as const

export type ExprType = (typeof ExprKinds)[keyof typeof ExprKinds]

export interface MathExpression {
  content: string
  type: ExprType
  start: number
  end: number
  fullMatch: string
  processedContent?: string
}

interface MathMatch {
  type: ExprType
  content: string
  start: number
  end: number
  fullMatch: string
}

export interface MathParserOptions {
  processBraces?: boolean
}

/**
 * Lightweight port of the backend math normaliser so cards render consistently in Anki.
 */
export class MathParser {
  private readonly processBraces: boolean
  private readonly displayPattern = /(?<!\\)\$\$(.+?)(?<!\\)\$\$/gs
  private readonly inlinePattern = /(?<!\\)\$(.+?)(?<!\\)\$/gs
  private readonly braceRunPattern = /}{2,}/g

  constructor(options?: MathParserOptions) {
    this.processBraces = options?.processBraces ?? true
  }

  spaceClosingBraces(text: string): string {
    return text.replace(this.braceRunPattern, match =>
      match.split('').join(' '),
    )
  }

  escapeMath(body: string): string {
    let escaped = body.replace(/(?<!\\)#/g, '\\#')
    escaped = escaped.replace(/(?<!\\)%/g, '\\%')
    escaped = escaped.replace(/(?<!\\)\s?(_)\s?/g, ' $1 ')
    escaped = escaped.replace(/(?<!\\)\s?(\*)\s?/g, ' $1 ')
    escaped = escaped.replace(/\n/g, ' ')
    return escaped
  }

  parse(text: string): MathExpression[] {
    return Array.from(this.iterExpressions(text))
  }

  *iterExpressions(text: string): Generator<MathExpression> {
    let cursor = 0
    while (true) {
      const next = this.findNextMath(text, cursor)
      if (!next) {
        break
      }

      const trimmed = next.content.trim()
      const body = trimmed.length > 0 ? trimmed : ' '

      let processed = this.processBraces
        ? this.spaceClosingBraces(body)
        : undefined
      processed = this.escapeMath(processed ?? body)

      yield {
        content: body,
        type: next.type,
        start: next.start,
        end: next.end,
        fullMatch: next.fullMatch,
        processedContent: processed,
      }

      cursor = next.end
    }
  }

  reconstructAnkiMath(text: string): string {
    const expressions = Array.from(this.iterExpressions(text))
    if (expressions.length === 0) {
      return text
    }

    const result: string[] = []
    let lastEnd = 0

    for (const expr of expressions) {
      result.push(text.slice(lastEnd, expr.start))

      const body = expr.processedContent ?? expr.content
      if (expr.type === ExprKinds.DISPLAY) {
        const beforeNewline = expr.start > 0 && text[expr.start - 1] === '\n'
        const afterNewline = expr.end < text.length && text[expr.end] === '\n'
        const prefix = beforeNewline ? '' : '\n'
        const suffix = afterNewline ? '' : '\n'
        result.push(`${prefix}$$${body}$$${suffix}`)
      } else {
        result.push(`$${body}$`)
      }

      lastEnd = expr.end
    }

    result.push(text.slice(lastEnd))
    return result.join('')
  }

  private findNextMath(text: string, startPos: number): MathMatch | null {
    const display = this.search(this.displayPattern, text, startPos)
    const inline = this.search(this.inlinePattern, text, startPos)

    if (!display && !inline) {
      return null
    }

    const matches: MathMatch[] = []
    if (display) {
      matches.push({
        type: ExprKinds.DISPLAY,
        content: display[1] ?? '',
        start: display.index ?? 0,
        end: (display.index ?? 0) + display[0].length,
        fullMatch: display[0],
      })
    }

    if (inline) {
      matches.push({
        type: ExprKinds.INLINE,
        content: inline[1] ?? '',
        start: inline.index ?? 0,
        end: (inline.index ?? 0) + inline[0].length,
        fullMatch: inline[0],
      })
    }

    matches.sort((a, b) => {
      if (a.start === b.start) {
        return a.type === ExprKinds.DISPLAY ? -1 : 1
      }
      return a.start - b.start
    })

    return matches[0]
  }

  private search(
    pattern: RegExp,
    text: string,
    startPos: number,
  ): RegExpMatchArray | null {
    pattern.lastIndex = startPos
    const match = pattern.exec(text)
    pattern.lastIndex = 0
    return match
  }
}
