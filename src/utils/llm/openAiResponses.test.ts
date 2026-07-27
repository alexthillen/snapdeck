import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateWithOpenAiResponses } from './openAiResponses'
import { parseLlmResponse } from './parser'

const pages = [
  {
    pageNumber: 1,
    text: 'Extracted PDF text',
    imageUrl: 'data:image/jpeg;base64,page-image',
  },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateWithOpenAiResponses', () => {
  it('sends page text and images to the Responses API without requiring a key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: 'generated cards' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateWithOpenAiResponses(
      {
        provider: 'openai-compatible',
        apiKey: '',
        baseUrl: 'http://127.0.0.1:8100/v1/',
        model: 'mlx-community/gemma-4-E4B-it-qat-4bit',
      },
      pages,
      'Make cards',
    )

    expect(result.text).toBe('generated cards')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:8100/v1/responses')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'mlx-community/gemma-4-E4B-it-qat-4bit',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: expect.stringContaining('Make cards'),
            },
            {
              type: 'input_text',
              text: expect.stringContaining('Extracted PDF text'),
            },
            {
              type: 'input_image',
              image_url: 'data:image/jpeg;base64,page-image',
              detail: 'auto',
            },
          ],
        },
      ],
      temperature: 0.1,
      top_p: 0.95,
    })
  })

  it('reads output text from the standard Responses output array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  { type: 'output_text', text: 'first' },
                  { type: 'output_text', text: 'second' },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(
      generateWithOpenAiResponses(
        {
          provider: 'openai-compatible',
          apiKey: '',
          baseUrl: 'https://example.test/v1',
          model: 'model',
        },
        pages,
        'Make cards',
      ),
    ).resolves.toMatchObject({ text: 'first\nsecond' })
  })

  it('reports the endpoint error message and sends a configured key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ detail: 'Model is not available' }),
        { status: 404 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateWithOpenAiResponses(
        {
          provider: 'openai-compatible',
          apiKey: 'token',
          baseUrl: 'https://example.test/v1',
          model: 'missing',
        },
        pages,
        'Make cards',
      ),
    ).rejects.toThrow('Model is not available')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token',
    })
  })
})

it.runIf(process.env.SNAPDECK_MLX_TEST === '1')(
  'generates a parseable card with text and image input on the local MLX server',
  async () => {
    const logo = await readFile(
      new URL('../../assets/snapdeck_logo.png', import.meta.url),
    )
    const result = await generateWithOpenAiResponses(
      {
        provider: 'openai-compatible',
        apiKey: '',
        baseUrl: 'http://127.0.0.1:8100/v1',
        model: 'mlx-community/gemma-4-E4B-it-qat-4bit',
      },
      [
        {
          pageNumber: 1,
          text: 'The capital of Switzerland is Bern.',
          imageUrl: `data:image/png;base64,${Buffer.from(logo).toString('base64')}`,
        },
      ],
      `Create exactly one basic flashcard from the document.
Return exactly this format without a code fence:

FRONT:

(question)

BACK:

(answer)

EXTRA:

(optional explanation)

DIFFICULTY: 1-10/10

TAGS: Geography::Europe::Capitals`,
    )

    const parsed = parseLlmResponse(result.text)
    expect(parsed.cards).toHaveLength(1)
    expect(parsed.cards[0]?.front).toMatch(/capital.*Switzerland/i)
    expect(parsed.cards[0]?.back).toMatch(/Bern/i)
  },
  60_000,
)
