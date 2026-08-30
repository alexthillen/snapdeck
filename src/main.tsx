import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/code-highlight/styles.css'
import './index.css'

import App from './App.tsx'

const cloudflareAnalyticsToken = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim()

if (import.meta.env.PROD && cloudflareAnalyticsToken) {
  const beacon = document.createElement('script')
  beacon.type = 'module'
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  beacon.dataset.cfBeacon = JSON.stringify({ token: cloudflareAnalyticsToken })
  document.head.append(beacon)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
