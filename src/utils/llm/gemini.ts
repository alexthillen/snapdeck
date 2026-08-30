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
}

const extractText = (payload: unknown): string => {
  const candidates = (payload as { candidates?: GeminiCandidate[] })?.candidates
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
          temperature: 0.1,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 4 * 8192,
        },
      }),
    },
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } })?.error?.message ||
      `Gemini API error (${response.status})`
    throw new Error(message)
  }

  const text = extractText(payload)
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  return { text, raw: payload }
}
