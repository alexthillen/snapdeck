const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-2.5-flash'

export interface GeminiGenerateOptions {
  apiKey: string
  base64Document: string
  prompt: string
  model?: string
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
}

export interface GeminiResponse {
  text: string
  raw: unknown
}

const buildUrl = (model: string) =>
  `${GEMINI_BASE_URL}/models/${model}:generateContent`

const extractText = (payload: any): string => {
  const candidates = payload?.candidates
  if (!Array.isArray(candidates)) {
    return ''
  }

  const texts: string[] = []

  candidates.forEach(candidate => {
    const parts = candidate?.content?.parts
    if (!Array.isArray(parts)) {
      return
    }
    parts.forEach((part: any) => {
      if (typeof part?.text === 'string') {
        texts.push(part.text)
      }
    })
  })

  return texts.join('\n').trim()
}

export class GeminiClient {
  async generateContent(
    options: GeminiGenerateOptions,
  ): Promise<GeminiResponse> {
    const {
      apiKey,
      base64Document,
      prompt,
      model = DEFAULT_MODEL,
      temperature = 0.1,
      topP = 0.95,
      topK = 64,
      maxOutputTokens = 4 * 8192,
    } = options

    const response = await fetch(buildUrl(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Document,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          topP,
          topK,
          maxOutputTokens,
        },
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        payload?.error?.message || `Gemini API error (${response.status})`
      throw new Error(message)
    }

    const text = extractText(payload)
    if (!text) {
      throw new Error('Gemini returned an empty response')
    }

    return {
      text,
      raw: payload,
    }
  }
}
