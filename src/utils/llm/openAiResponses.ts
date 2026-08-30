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
  status?: string
  incomplete_details?: {
    reason?: string
  }
}

type StreamPayload = ResponsesPayload & {
  type?: string
  delta?: string
  text?: string
  response?: ResponsesPayload & {
    error?: { message?: string }
  }
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

const assertComplete = (payload: ResponsesPayload) => {
  if (payload.status === 'incomplete') {
    const reason = payload.incomplete_details?.reason
    throw new Error(
      reason
        ? `The OpenAI-compatible response was incomplete (${reason})`
        : 'The OpenAI-compatible response was incomplete',
    )
  }
}

const streamResponseText = async (
  response: Response,
  onText: (text: string) => void,
): Promise<{ text: string; raw: unknown }> => {
  if (!response.body) {
    throw new Error('The OpenAI-compatible model returned no response stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let completed: StreamPayload | undefined

  const processFrame = (frame: string) => {
    const data = frame
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
    if (!data || data === '[DONE]') return

    const payload = JSON.parse(data) as StreamPayload
    if (payload.type === 'response.output_text.delta' && payload.delta) {
      text += payload.delta
      onText(text)
    } else if (payload.type === 'response.output_text.done' && payload.text) {
      text = payload.text
      onText(text)
    } else if (payload.type === 'response.completed') {
      completed = payload
    } else if (payload.type === 'response.incomplete') {
      const reason = payload.response?.incomplete_details?.reason
      throw new Error(
        reason
          ? `The OpenAI-compatible response was incomplete (${reason})`
          : 'The OpenAI-compatible response was incomplete',
      )
    } else if (payload.type === 'error' || payload.type === 'response.failed') {
      throw new Error(
        payload.error?.message ||
          payload.response?.error?.message ||
          'The OpenAI-compatible response stream failed',
      )
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })

    let boundary = buffer.match(/\r?\n\r?\n/)
    while (boundary?.index != null) {
      processFrame(buffer.slice(0, boundary.index))
      buffer = buffer.slice(boundary.index + boundary[0].length)
      boundary = buffer.match(/\r?\n\r?\n/)
    }

    if (done) break
  }

  if (buffer.trim()) processFrame(buffer)
  if (!text && completed?.response) {
    assertComplete(completed.response)
    text = extractResponseText(completed.response)
  }
  if (!text.trim()) {
    throw new Error('The OpenAI-compatible model returned an empty response')
  }

  return { text, raw: completed ?? { streamed: true } }
}

export const generateWithOpenAiResponses = async (
  config: OpenAiCompatibleConfig,
  pages: PdfPageInput[],
  prompt: string,
  options?: {
    signal?: AbortSignal
    onText?: (text: string) => void
  },
): Promise<{ text: string; raw: unknown }> => {
  const apiKey = config.apiKey.trim()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  if (options?.onText) {
    headers.Accept = 'text/event-stream'
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
      stream: Boolean(options?.onText),
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ResponsesPayload
    throw new Error(
      payload.error?.message ||
        payload.detail ||
        `OpenAI-compatible API error (${response.status})`,
    )
  }

  if (options?.onText) {
    return streamResponseText(response, options.onText)
  }

  const payload = (await response.json().catch(() => ({}))) as ResponsesPayload
  assertComplete(payload)
  const text = extractResponseText(payload)
  if (!text) {
    throw new Error('The OpenAI-compatible model returned an empty response')
  }

  return { text, raw: payload }
}
