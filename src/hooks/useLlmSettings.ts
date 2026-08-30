import { useSyncExternalStore } from 'react'
import {
  createDefaultLlmSettings,
  type LlmProvider,
  type LlmSettings,
} from '../utils/llm/config'

const STORAGE_KEYS = {
  settings: 'snapdeck.llmSettings',
  apiKeys: 'snapdeck.llmApiKeys',
  legacyGeminiApiKey: 'snapdeck.geminiApiKey',
  legacyPersistPreference: 'snapdeck.persistApiKey',
} as const
const RETIRED_LOCAL_MODEL = 'gemma-4-e4b-it'

type StoredSettings = {
  provider?: LlmProvider
  geminiModel?: string
  openAiBaseUrl?: string
  openAiModel?: string
  contextTokens?: number
  shouldPersistApiKeys?: boolean
}

type StoredApiKeys = {
  gemini?: string
  openAiCompatible?: string
}

const parseStoredJson = <T,>(value: string | null): Partial<T> => {
  if (!value) {
    return {}
  }

  try {
    return JSON.parse(value) as Partial<T>
  } catch {
    return {}
  }
}

const readSettingsFromStorage = (): LlmSettings => {
  const defaults = createDefaultLlmSettings()
  if (typeof window === 'undefined') {
    return defaults
  }

  const stored = parseStoredJson<StoredSettings>(
    window.localStorage.getItem(STORAGE_KEYS.settings),
  )
  const legacyPersistPreference = window.localStorage.getItem(
    STORAGE_KEYS.legacyPersistPreference,
  )
  const legacyGeminiApiKey =
    window.localStorage.getItem(STORAGE_KEYS.legacyGeminiApiKey) ?? ''
  const shouldPersistApiKeys =
    stored.shouldPersistApiKeys ??
    (legacyPersistPreference === 'true' ||
      (legacyPersistPreference === null && Boolean(legacyGeminiApiKey)))
  const keys = shouldPersistApiKeys
    ? parseStoredJson<StoredApiKeys>(
        window.localStorage.getItem(STORAGE_KEYS.apiKeys),
      )
    : {}
  const storedOpenAiModel = stored.openAiModel?.trim()

  return {
    provider:
      stored.provider === 'openai-compatible' ? 'openai-compatible' : 'gemini',
    gemini: {
      apiKey:
        keys.gemini?.trim() ||
        (shouldPersistApiKeys ? legacyGeminiApiKey.trim() : ''),
      model: stored.geminiModel?.trim() || defaults.gemini.model,
    },
    openAiCompatible: {
      apiKey: keys.openAiCompatible?.trim() ?? '',
      baseUrl:
        stored.openAiBaseUrl?.trim() ||
        defaults.openAiCompatible.baseUrl,
      model:
        !storedOpenAiModel || storedOpenAiModel === RETIRED_LOCAL_MODEL
          ? defaults.openAiCompatible.model
          : storedOpenAiModel,
    },
    contextTokens:
      typeof stored.contextTokens === 'number' && stored.contextTokens >= 8_192
        ? stored.contextTokens
        : defaults.contextTokens,
    shouldPersistApiKeys,
  }
}

const persistSettings = (settings: LlmSettings) => {
  if (typeof window === 'undefined') {
    return
  }

  const stored: StoredSettings = {
    provider: settings.provider,
    geminiModel: settings.gemini.model.trim(),
    openAiBaseUrl: settings.openAiCompatible.baseUrl.trim(),
    openAiModel: settings.openAiCompatible.model.trim(),
    contextTokens: settings.contextTokens,
    shouldPersistApiKeys: settings.shouldPersistApiKeys,
  }
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(stored))

  if (settings.shouldPersistApiKeys) {
    const keys: StoredApiKeys = {
      gemini: settings.gemini.apiKey.trim(),
      openAiCompatible: settings.openAiCompatible.apiKey.trim(),
    }
    window.localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(keys))
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.apiKeys)
  }

  window.localStorage.removeItem(STORAGE_KEYS.legacyGeminiApiKey)
  window.localStorage.removeItem(STORAGE_KEYS.legacyPersistPreference)
}

let sharedSettings = readSettingsFromStorage()
const subscribers = new Set<() => void>()
let storageListenerAttached = false

const notifySubscribers = () => {
  subscribers.forEach(listener => listener())
}

const ensureStorageListener = () => {
  if (storageListenerAttached || typeof window === 'undefined') {
    return
  }

  storageListenerAttached = true
  window.addEventListener('storage', event => {
    if (
      event.key === STORAGE_KEYS.settings ||
      event.key === STORAGE_KEYS.apiKeys
    ) {
      sharedSettings = readSettingsFromStorage()
      notifySubscribers()
    }
  })
}

const subscribe = (listener: () => void) => {
  subscribers.add(listener)
  ensureStorageListener()
  return () => subscribers.delete(listener)
}

const getSnapshot = () => sharedSettings
const serverSnapshot = createDefaultLlmSettings()
const getServerSnapshot = () => serverSnapshot

export const useLlmSettings = () => {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const setSettings = (
    updater: LlmSettings | ((previous: LlmSettings) => LlmSettings),
  ) => {
    sharedSettings =
      typeof updater === 'function' ? updater(sharedSettings) : updater
    persistSettings(sharedSettings)
    notifySubscribers()
  }

  return { settings, setSettings }
}
