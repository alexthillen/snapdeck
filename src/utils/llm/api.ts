import type { LlmConfig } from './config'
import type { PdfPageInput } from './document'
import { generateWithGemini } from './gemini'
import { generateWithOpenAiResponses } from './openAiResponses'

export type GenerateCardsOptions = {
  config: LlmConfig
  pages: PdfPageInput[]
  prompt: string
}

export type LlmResponse = {
  text: string
  raw: unknown
}

export const generateCards = async ({
  config,
  pages,
  prompt,
}: GenerateCardsOptions): Promise<LlmResponse> => {
  if (config.provider === 'gemini') {
    return generateWithGemini(config, pages, prompt)
  }

  return generateWithOpenAiResponses(config, pages, prompt)
}
