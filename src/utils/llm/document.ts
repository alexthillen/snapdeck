import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { AnalyzedDocument, PdfOutlineNode, PageRange } from '../../documents/types'

const PAGE_RENDER_SCALE = 1.5
const PAGE_IMAGE_QUALITY = 0.85

export type PdfPageInput = {
  pageNumber: number
  text: string
  imageUrl: string
}

type RawOutlineNode = {
  title: string
  dest: string | unknown[] | null
  items: RawOutlineNode[]
}

type PdfProxy = {
  numPages: number
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{
      items: Array<{ str?: string; hasEOL?: boolean }>
    }>
    getViewport: (options: { scale: number }) => { width: number; height: number }
    render: (options: {
      canvas: HTMLCanvasElement
      viewport: { width: number; height: number }
      background: string
    }) => { promise: Promise<void> }
  }>
  getOutline: () => Promise<RawOutlineNode[] | null>
  getDestination: (id: string) => Promise<unknown[] | null>
  getPageIndex: (reference: { num: number; gen: number }) => Promise<number>
}

const loadPdf = async (file: File) => {
  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  })
  const pdf = (await loadingTask.promise) as unknown as PdfProxy
  return { pdf, destroy: () => loadingTask.destroy() }
}

const extractPageText = async (pdf: PdfProxy, pageNumber: number): Promise<string> => {
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  return content.items
    .flatMap(item =>
      typeof item.str === 'string'
        ? [`${item.str}${item.hasEOL ? '\n' : ' '}`]
        : [],
    )
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

const resolveDestinationPage = async (
  pdf: PdfProxy,
  destination: string | unknown[] | null,
): Promise<number | null> => {
  const resolved =
    typeof destination === 'string'
      ? await pdf.getDestination(destination)
      : destination
  const reference = resolved?.[0]
  if (typeof reference === 'number') {
    return reference
  }
  if (
    reference &&
    typeof reference === 'object' &&
    'num' in reference &&
    'gen' in reference
  ) {
    return pdf.getPageIndex(reference as { num: number; gen: number })
  }
  return null
}

const resolveOutline = async (
  pdf: PdfProxy,
  nodes: RawOutlineNode[],
  prefix = 'outline',
): Promise<PdfOutlineNode[]> => {
  const resolved = await Promise.all(
    nodes.map(async (node, index): Promise<PdfOutlineNode | null> => {
      const pageIndex = await resolveDestinationPage(pdf, node.dest)
      if (pageIndex == null) {
        return null
      }
      const id = `${prefix}-${index + 1}`
      return {
        id,
        title: node.title.trim() || `Section ${index + 1}`,
        pageIndex,
        children: await resolveOutline(pdf, node.items ?? [], id),
      }
    }),
  )
  return resolved.filter((node): node is PdfOutlineNode => node !== null)
}

const documentId = (): string => {
  const unique = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `pdf-${unique}`
}

export const analyzePdf = async (file: File): Promise<AnalyzedDocument> => {
  const { pdf, destroy } = await loadPdf(file)
  try {
    const pages = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const text = await extractPageText(pdf, pageNumber)
      pages.push({
        pageIndex: pageNumber - 1,
        text,
        estimatedTokens: Math.ceil(text.length / 4),
      })
    }
    const outline = await resolveOutline(pdf, (await pdf.getOutline()) ?? [])
    return {
      id: documentId(),
      file,
      fileName: file.name,
      title: file.name.replace(/\.pdf$/i, ''),
      pageCount: pdf.numPages,
      pages,
      outline,
    }
  } finally {
    await destroy()
  }
}

export const renderPdfPages = async (
  document: AnalyzedDocument,
  range: PageRange,
): Promise<PdfPageInput[]> => {
  const { pdf, destroy } = await loadPdf(document.file)
  try {
    const pages: PdfPageInput[] = []
    for (let pageIndex = range.start; pageIndex < range.end; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex + 1)
      const viewport = page.getViewport({ scale: PAGE_RENDER_SCALE })
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)

      await page.render({ canvas, viewport, background: '#ffffff' }).promise

      const imageUrl = canvas.toDataURL('image/jpeg', PAGE_IMAGE_QUALITY)
      canvas.width = 0
      canvas.height = 0
      pages.push({
        pageNumber: pageIndex + 1,
        text: document.pages[pageIndex].text,
        imageUrl,
      })
    }
    return pages
  } finally {
    await destroy()
  }
}
