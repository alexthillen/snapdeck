import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzePdf, renderPdfPages } from './document'

const pdfMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  render: vi.fn(() => ({ promise: Promise.resolve() })),
  getOutline: vi.fn(async () => [
    {
      title: 'Chapter 1',
      dest: [{ num: 10, gen: 0 }],
      items: [
        { title: 'Section 1.1', dest: 'named-section', items: [] },
      ],
    },
  ]),
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
      getOutline: pdfMocks.getOutline,
      getDestination: vi.fn(async () => [1]),
      getPageIndex: vi.fn(async () => 0),
    }),
    destroy: pdfMocks.destroy,
  })),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('PDF document handling', () => {
  it('analyzes text and nested bookmarks without rendering pages', async () => {
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
    const document = await analyzePdf(file)

    expect(document.pages.map(page => page.text)).toEqual([
      'Page 1 content',
      'Page 2 content',
    ])
    expect(document.outline).toEqual([
      {
        id: 'outline-1',
        title: 'Chapter 1',
        pageIndex: 0,
        children: [
          {
            id: 'outline-1-1',
            title: 'Section 1.1',
            pageIndex: 1,
            children: [],
          },
        ],
      },
    ])
    expect(pdfMocks.render).not.toHaveBeenCalled()
    expect(pdfMocks.destroy).toHaveBeenCalledOnce()
  })

  it('renders only the requested page range and releases the PDF', async () => {
    const toDataURL = vi.fn(() => 'data:image/jpeg;base64,page-two')
    const canvas = { width: 0, height: 0, toDataURL }
    vi.stubGlobal('window', {
      document: { createElement: vi.fn(() => canvas) },
    })
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
    const document = await analyzePdf(file)
    pdfMocks.destroy.mockClear()

    const pages = await renderPdfPages(document, { start: 1, end: 2 })

    expect(pages).toEqual([
      {
        pageNumber: 2,
        text: 'Page 2 content',
        imageUrl: 'data:image/jpeg;base64,page-two',
      },
    ])
    expect(pdfMocks.render).toHaveBeenCalledOnce()
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
    expect(pdfMocks.destroy).toHaveBeenCalledOnce()
  })
})
