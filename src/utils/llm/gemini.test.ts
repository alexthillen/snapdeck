import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateWithGemini } from './gemini'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateWithGemini', () => {
  it('uses the configured model and sends selected page text and images', async () => {
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
        model: 'gemini-3.7-flash',
      },
      [
        {
          pageNumber: 4,
          text: 'Chapter text',
          imageUrl: 'data:image/jpeg;base64,page-image',
        },
      ],
      'make cards',
    )

    expect(result.text).toBe('cards')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/models/gemini-3.7-flash:generateContent')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-goog-api-key': 'secret',
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      contents: [
        {
          parts: [
            { text: expect.stringContaining('make cards') },
            { text: expect.stringContaining('Chapter text') },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: 'page-image',
              },
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 32768 },
    })
    expect(JSON.parse(init.body as string).generationConfig).not.toHaveProperty('temperature')
    expect(JSON.parse(init.body as string).generationConfig).not.toHaveProperty('topP')
    expect(JSON.parse(init.body as string).generationConfig).not.toHaveProperty('topK')
  })

  it('rejects a response that stopped before natural completion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({
        candidates: [{
          content: { parts: [{ text: 'partial cards' }] },
          finishReason: 'MAX_TOKENS',
        }],
      }), { status: 200 })),
    )

    await expect(generateWithGemini(
      { provider: 'gemini', apiKey: 'secret', model: 'gemini-3.7-flash' },
      [],
      'make cards',
    )).rejects.toThrow('MAX_TOKENS')
  })
})
