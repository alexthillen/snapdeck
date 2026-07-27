import { fileToBase64 } from '../file'
import type { LlmConfig } from './config'
import { readPdfPages } from './document'
import { generateWithGemini } from './gemini'
import { generateWithOpenAiResponses } from './openAiResponses'

export type GenerateCardsOptions = {
  config: LlmConfig
  file: File
  prompt: string
}

export type LlmResponse = {
  text: string
  raw: unknown
}

export const generateCards = async ({
  config,
  file,
  prompt,
}: GenerateCardsOptions): Promise<LlmResponse> => {
  if (config.provider === 'gemini') {
    const base64Document = await fileToBase64(file)
    return generateWithGemini(config, base64Document, prompt)
  }

  const pages = await readPdfPages(file)
  return generateWithOpenAiResponses(config, pages, prompt)
}
