import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateWithGemini } from './gemini'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateWithGemini', () => {
  it('uses the configured model and sends the PDF inline', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'cards' }] } }],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateWithGemini(
      {
        provider: 'gemini',
        apiKey: 'secret',
        model: 'gemini-3.6-flash',
      },
      'base64-pdf',
      'make cards',
    )

    expect(result.text).toBe('cards')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/models/gemini-3.6-flash:generateContent')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-goog-api-key': 'secret',
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      contents: [
        {
          parts: [
            { text: 'make cards' },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: 'base64-pdf',
              },
            },
          ],
        },
      ],
    })
  })
})

