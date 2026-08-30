import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  createDefaultLlmSettings,
  getActiveLlmConfig,
  isLlmConfigReady,
} from './config'

describe('LLM configuration', () => {
  it('defaults to Gemini 3.7 Flash', () => {
    const settings = createDefaultLlmSettings()

    expect(settings.provider).toBe('gemini')
    expect(settings.gemini.model).toBe('gemini-3.7-flash')
    expect(settings.gemini.model).toBe(DEFAULT_GEMINI_MODEL)
    expect(isLlmConfigReady(getActiveLlmConfig(settings))).toBe(false)
  })

  it('provides working defaults for the local MLX server', () => {
    const settings = {
      ...createDefaultLlmSettings(),
      provider: 'openai-compatible' as const,
    }
    const config = getActiveLlmConfig(settings)

    expect(config).toEqual({
      provider: 'openai-compatible',
      apiKey: '',
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      model: DEFAULT_OPENAI_MODEL,
    })
    expect(isLlmConfigReady(config)).toBe(true)
  })
})
