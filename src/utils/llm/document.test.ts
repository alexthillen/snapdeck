import { afterEach, describe, expect, it, vi } from 'vitest'
import { readPdfPages } from './document'

const pdfMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  render: vi.fn(() => ({ promise: Promise.resolve() })),
}))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn(async (pageNumber: number) => ({
        getTextContent: vi.fn(async () => ({
          items: [
            { str: `Page ${pageNumber}`, hasEOL: false },
            { str: 'content', hasEOL: true },
          ],
        })),
        getViewport: vi.fn(() => ({ width: 918, height: 1188 })),
        render: pdfMocks.render,
      })),
    }),
    destroy: pdfMocks.destroy,
  })),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('readPdfPages', () => {
  it('extracts text and renders every PDF page as a JPEG data URL', async () => {
    const toDataUrls = [
      vi.fn(() => 'data:image/jpeg;base64,page-one'),
      vi.fn(() => 'data:image/jpeg;base64,page-two'),
    ]
    const canvases = toDataUrls.map(toDataURL => ({
      width: 0,
      height: 0,
      toDataURL,
    }))
    const createElement = vi
      .fn()
      .mockReturnValueOnce(canvases[0])
      .mockReturnValueOnce(canvases[1])
    vi.stubGlobal('document', { createElement })

    const file = new File(['pdf'], 'document.pdf', {
      type: 'application/pdf',
    })
    const pages = await readPdfPages(file)

    expect(pages).toEqual([
      {
        pageNumber: 1,
        text: 'Page 1 content',
        imageUrl: 'data:image/jpeg;base64,page-one',
      },
      {
        pageNumber: 2,
        text: 'Page 2 content',
        imageUrl: 'data:image/jpeg;base64,page-two',
      },
    ])
    expect(createElement).toHaveBeenCalledTimes(2)
    expect(toDataUrls[0]).toHaveBeenCalledWith('image/jpeg', 0.85)
    expect(toDataUrls[1]).toHaveBeenCalledWith('image/jpeg', 0.85)
    expect(pdfMocks.render).toHaveBeenCalledTimes(2)
    expect(pdfMocks.destroy).toHaveBeenCalledOnce()
  })
})
