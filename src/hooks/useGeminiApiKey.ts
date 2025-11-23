import { useSyncExternalStore } from 'react'

const STORAGE_KEYS = {
  apiKey: 'snapdeck.geminiApiKey',
  persistPreference: 'snapdeck.persistApiKey',
} as const

export type ApiKeyState = {
  apiKey: string
  shouldPersistApiKey: boolean
}

const getEmptyApiKeyState = (): ApiKeyState => ({
  apiKey: '',
  shouldPersistApiKey: false,
})

const readApiKeyStateFromStorage = (): ApiKeyState => {
  if (typeof window === 'undefined') {
    return getEmptyApiKeyState()
  }

  const persistedPreference = window.localStorage.getItem(
    STORAGE_KEYS.persistPreference,
  )

  const shouldPersistApiKey =
    persistedPreference === 'true' ||
    (persistedPreference === null &&
      Boolean(window.localStorage.getItem(STORAGE_KEYS.apiKey)))

  const apiKey = shouldPersistApiKey
    ? window.localStorage.getItem(STORAGE_KEYS.apiKey)?.trim() ?? ''
    : ''

  return {
    apiKey,
    shouldPersistApiKey,
  }
}

let sharedApiKeyState: ApiKeyState =
  typeof window === 'undefined'
    ? getEmptyApiKeyState()
    : readApiKeyStateFromStorage()

const apiKeySubscribers = new Set<() => void>()
let storageListenerAttached = false

const notifyApiKeySubscribers = () => {
  apiKeySubscribers.forEach(listener => listener())
}

const persistApiKeyState = (state: ApiKeyState) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    STORAGE_KEYS.persistPreference,
    state.shouldPersistApiKey ? 'true' : 'false',
  )

  if (!state.shouldPersistApiKey) {
    window.localStorage.removeItem(STORAGE_KEYS.apiKey)
    return
  }

  const trimmedKey = state.apiKey.trim()
  if (trimmedKey) {
    window.localStorage.setItem(STORAGE_KEYS.apiKey, trimmedKey)
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.apiKey)
  }
}

const updateSharedApiKeyState = (
  updater: (prevState: ApiKeyState) => ApiKeyState,
) => {
  sharedApiKeyState = updater(sharedApiKeyState)
  persistApiKeyState(sharedApiKeyState)
  notifyApiKeySubscribers()
}

const subscribeToApiKeyStore = (listener: () => void) => {
  apiKeySubscribers.add(listener)
  ensureStorageListener()
  return () => {
    apiKeySubscribers.delete(listener)
  }
}

const getApiKeySnapshot = () => sharedApiKeyState
const getServerApiKeySnapshot = () => getEmptyApiKeyState()

const ensureStorageListener = () => {
  if (storageListenerAttached || typeof window === 'undefined') return
  storageListenerAttached = true

  window.addEventListener('storage', event => {
    if (
      event.key === STORAGE_KEYS.apiKey ||
      event.key === STORAGE_KEYS.persistPreference
    ) {
      sharedApiKeyState = readApiKeyStateFromStorage()
      notifyApiKeySubscribers()
    }
  })
}

export const useGeminiApiKeyState = () => {
  const state = useSyncExternalStore(
    subscribeToApiKeyStore,
    getApiKeySnapshot,
    getServerApiKeySnapshot,
  )

  const setApiKey = (value: string) => {
    updateSharedApiKeyState(prev => ({ ...prev, apiKey: value }))
  }

  const setShouldPersistApiKey = (value: boolean) => {
    updateSharedApiKeyState(prev => ({ ...prev, shouldPersistApiKey: value }))
  }

  return {
    apiKey: state.apiKey,
    shouldPersistApiKey: state.shouldPersistApiKey,
    setApiKey,
    setShouldPersistApiKey,
  }
}
