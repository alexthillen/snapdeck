import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzePdf, createPdfRenderSession, renderPdfPages } from './document'

type OutlineFixture = {
  title: string
  dest: string | unknown[] | null
  items: OutlineFixture[]
}

const pdfMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  render: vi.fn(() => ({ promise: Promise.resolve() })),
  getPageIndex: vi.fn(async () => 0),
  getOutline: vi.fn(async (): Promise<OutlineFixture[]> => [
    {
      title: 'Chapter 1',
      dest: [{ num: 10, gen: 0 }],
      items: [
        { title: 'Section 1.1', dest: 'named-section', items: [] },
      ],
    },
  ]),
}))

const pdfLibrary = vi.hoisted(() => ({ getDocument: vi.fn() }))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: pdfLibrary.getDocument,
}))

const configurePdf = () => {
  pdfLibrary.getDocument.mockImplementation(() => ({
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
      getPageIndex: pdfMocks.getPageIndex,
    }),
    destroy: pdfMocks.destroy,
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('PDF document handling', () => {
  beforeEach(() => configurePdf())

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

  it('keeps one PDF open while rendering multiple generation units', async () => {
    const canvas = {
      width: 0,
      height: 0,
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,page'),
    }
    vi.stubGlobal('window', { document: { createElement: vi.fn(() => canvas) } })
    const analyzed = await analyzePdf(new File(['pdf'], 'document.pdf', { type: 'application/pdf' }))
    pdfLibrary.getDocument.mockClear()
    pdfMocks.destroy.mockClear()

    const session = await createPdfRenderSession(analyzed)
    await session.render({ start: 0, end: 1 })
    await session.render({ start: 1, end: 2 })
    await session.destroy()

    expect(pdfLibrary.getDocument).toHaveBeenCalledOnce()
    expect(pdfMocks.destroy).toHaveBeenCalledOnce()
  })

  it('stops rendering before later pages after cancellation', async () => {
    const controller = new AbortController()
    pdfMocks.render.mockImplementationOnce(() => ({
      promise: Promise.resolve().then(() => controller.abort()),
      cancel: vi.fn(),
    }))
    const canvas = {
      width: 0,
      height: 0,
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,page'),
    }
    vi.stubGlobal('window', { document: { createElement: vi.fn(() => canvas) } })
    const analyzed = await analyzePdf(new File(['pdf'], 'document.pdf', { type: 'application/pdf' }))
    const session = await createPdfRenderSession(analyzed)

    await expect(session.render({ start: 0, end: 2 }, controller.signal))
      .rejects.toThrow('aborted')
    expect(pdfMocks.render).toHaveBeenCalledOnce()
    await session.destroy()
  })

  it('promotes valid children when grouping bookmarks have no destination', async () => {
    pdfMocks.getOutline.mockResolvedValueOnce([
      {
        title: 'Group',
        dest: null,
        items: [{ title: 'Valid child', dest: [{ num: 10, gen: 0 }], items: [] }],
      },
      { title: 'Broken sibling', dest: [{ num: 99, gen: 0 }], items: [] },
    ])
    pdfMocks.getPageIndex
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error('Broken destination'))

    const analyzed = await analyzePdf(new File(['pdf'], 'document.pdf', { type: 'application/pdf' }))

    expect(analyzed.outline).toEqual([
      {
        id: 'outline-1-1',
        title: 'Valid child',
        pageIndex: 0,
        children: [],
      },
    ])
  })
})
