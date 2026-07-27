import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const PAGE_RENDER_SCALE = 1.5
const PAGE_IMAGE_QUALITY = 0.85

export type PdfPageInput = {
  pageNumber: number
  text: string
  imageUrl: string
}

export const readPdfPages = async (file: File): Promise<PdfPageInput[]> => {
  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  })
  const pdf = await loadingTask.promise

  try {
    const pages: PdfPageInput[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = content.items
        .flatMap(item =>
          'str' in item
            ? [`${item.str}${item.hasEOL ? '\n' : ' '}`]
            : [],
        )
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .trim()

      const viewport = page.getViewport({ scale: PAGE_RENDER_SCALE })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)

      await page.render({
        canvas,
        viewport,
        background: '#ffffff',
      }).promise

      const imageUrl = canvas.toDataURL('image/jpeg', PAGE_IMAGE_QUALITY)
      canvas.width = 0
      canvas.height = 0

      pages.push({ pageNumber, text, imageUrl })
    }

    return pages
  } finally {
    await loadingTask.destroy()
  }
}
