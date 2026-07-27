export type LlmProvider = 'gemini' | 'openai-compatible'

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash'
export const DEFAULT_OPENAI_BASE_URL = 'http://127.0.0.1:8100/v1'
export const DEFAULT_OPENAI_MODEL =
  'mlx-community/gemma-4-E4B-it-qat-4bit'

export type GeminiConfig = {
  provider: 'gemini'
  apiKey: string
  model: string
}

export type OpenAiCompatibleConfig = {
  provider: 'openai-compatible'
  apiKey: string
  baseUrl: string
  model: string
}

export type LlmConfig = GeminiConfig | OpenAiCompatibleConfig

export type LlmSettings = {
  provider: LlmProvider
  gemini: Omit<GeminiConfig, 'provider'>
  openAiCompatible: Omit<OpenAiCompatibleConfig, 'provider'>
  shouldPersistApiKeys: boolean
}

export const createDefaultLlmSettings = (): LlmSettings => ({
  provider: 'gemini',
  gemini: {
    apiKey: '',
    model: DEFAULT_GEMINI_MODEL,
  },
  openAiCompatible: {
    apiKey: '',
    baseUrl: DEFAULT_OPENAI_BASE_URL,
    model: DEFAULT_OPENAI_MODEL,
  },
  shouldPersistApiKeys: false,
})

export const getActiveLlmConfig = (settings: LlmSettings): LlmConfig =>
  settings.provider === 'gemini'
    ? {
        provider: 'gemini',
        apiKey: settings.gemini.apiKey,
        model: settings.gemini.model,
      }
    : {
        provider: 'openai-compatible',
        apiKey: settings.openAiCompatible.apiKey,
        baseUrl: settings.openAiCompatible.baseUrl,
        model: settings.openAiCompatible.model,
      }

export const isLlmConfigReady = (config: LlmConfig): boolean => {
  if (!config.model.trim()) {
    return false
  }

  if (config.provider === 'gemini') {
    return Boolean(config.apiKey.trim())
  }

  return Boolean(config.baseUrl.trim())
}
