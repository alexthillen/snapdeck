// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { createTheme, MantineProvider } from '@mantine/core'
// import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications'
import Layout from './components/Layout'
import CreateDeck from './pages/CreateDeck'
import { SectionWrapper } from './components/SectionWrapper'

const theme = createTheme({
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '700',
  },
  primaryColor: 'blue',
  colors: {
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
      '#0c5692',
    ],
  },
})

function App() {
  return (
    <MantineProvider
      withGlobalClasses={true}
      defaultColorScheme="light"
      theme={theme}
    >
      <Notifications position="top-center" />
      <Router>
        <Routes>
          <Route
            path="/snapdeck/"
            element={
              <Layout>
                <CreateDeck />
              </Layout>
            }
          />
          <Route
            path="*"
            element={
              <Layout>
                <SectionWrapper title="Page not Found" />
              </Layout>
            }
          />
        </Routes>
      </Router>
    </MantineProvider>
  )
}

export default App
