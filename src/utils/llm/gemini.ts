import type { GeminiConfig } from './config'
import type { PdfPageInput } from './document'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

type GeminiPart = {
  text?: string
  [key: string]: unknown
}

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[]
  }
  finishReason?: string
  finishMessage?: string
}

type GeminiPayload = {
  candidates?: GeminiCandidate[]
  promptFeedback?: {
    blockReason?: string
  }
  error?: { message?: string }
}

const extractText = (payload: unknown): string => {
  const candidates = (payload as GeminiPayload)?.candidates
  if (!Array.isArray(candidates)) {
    return ''
  }

  return candidates
    .flatMap(candidate => candidate.content?.parts ?? [])
    .flatMap(part => (typeof part.text === 'string' ? [part.text] : []))
    .join('\n')
    .trim()
}

export const generateWithGemini = async (
  config: GeminiConfig,
  pages: PdfPageInput[],
  prompt: string,
  signal?: AbortSignal,
): Promise<{ text: string; raw: unknown }> => {
  const model = config.model.trim()
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${prompt}\n\nThe selected PDF section follows page by page. Use both extracted text and page images.`,
              },
              ...pages.flatMap(page => [
                {
                  text: `PDF page ${page.pageNumber} extracted text:\n${page.text || '[No text was extracted from this page.]'}`,
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: page.imageUrl.replace(/^data:image\/[^;]+;base64,/, ''),
                  },
                },
              ]),
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4 * 8192,
        },
      }),
      signal,
    },
  )

  const payload = await response.json().catch(() => ({})) as GeminiPayload
  if (!response.ok) {
    const message =
      payload.error?.message ||
      `Gemini API error (${response.status})`
    throw new Error(message)
  }

  if (payload.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt (${payload.promptFeedback.blockReason})`)
  }

  const candidate = payload.candidates?.[0]
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(
      candidate.finishMessage || `Gemini returned an incomplete response (${candidate.finishReason})`,
    )
  }

  const text = extractText(payload)
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  return { text, raw: payload }
}
