import type { OpenAiCompatibleConfig } from './config'
import type { PdfPageInput } from './document'

type ResponsesPayload = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
  error?: {
    message?: string
  }
  detail?: string
}

type ResponseInputContent =
  | {
      type: 'input_text'
      text: string
    }
  | {
      type: 'input_image'
      image_url: string
      detail: 'auto'
    }

const responsesUrl = (baseUrl: string): string =>
  `${baseUrl.trim().replace(/\/+$/, '')}/responses`

const buildInputContent = (
  prompt: string,
  pages: PdfPageInput[],
): ResponseInputContent[] => {
  const content: ResponseInputContent[] = [
    {
      type: 'input_text',
      text: `${prompt}

The uploaded PDF follows page by page. Each page includes extracted text for precise wording and a rendered image for layout, figures, diagrams, and text that extraction may have missed. Use both representations as source material.`,
    },
  ]

  pages.forEach(page => {
    content.push(
      {
        type: 'input_text',
        text: `PDF page ${page.pageNumber} extracted text:
${page.text || '[No text was extracted from this page.]'}`,
      },
      {
        type: 'input_image',
        image_url: page.imageUrl,
        detail: 'auto',
      },
    )
  })

  return content
}

const extractResponseText = (payload: ResponsesPayload): string => {
  const outputText = payload.output_text?.trim()
  if (outputText) {
    return outputText
  }

  return (
    payload.output
      ?.flatMap(item => item.content ?? [])
      .filter(part => part.type === 'output_text')
      .map(part => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n') ?? ''
  )
}

export const generateWithOpenAiResponses = async (
  config: OpenAiCompatibleConfig,
  pages: PdfPageInput[],
  prompt: string,
): Promise<{ text: string; raw: unknown }> => {
  const apiKey = config.apiKey.trim()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(responsesUrl(config.baseUrl), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model.trim(),
      input: [
        {
          role: 'user',
          content: buildInputContent(prompt, pages),
        },
      ],
      temperature: 0.1,
      top_p: 0.95,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as ResponsesPayload
  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        payload.detail ||
        `OpenAI-compatible API error (${response.status})`,
    )
  }

  const text = extractResponseText(payload)
  if (!text) {
    throw new Error('The OpenAI-compatible model returned an empty response')
  }

  return { text, raw: payload }
}
