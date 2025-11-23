import { useState } from 'react'
import { 
  Anchor, 
  Alert, 
  PasswordInput, 
  Stack, 
  Switch, 
  Text, 
  Paper, 
  Collapse, 
  Group, 
  UnstyledButton,
  Badge,
  ThemeIcon
} from '@mantine/core'
import { 
  IconChevronDown, 
  IconChevronUp, 
  IconKey, 
  IconCheck, 
  IconAlertCircle 
} from '@tabler/icons-react'

type GeminiApiKeyFormProps = {
  apiKey: string
  onApiKeyChange: (value: string) => void
  shouldPersistApiKey: boolean
  onShouldPersistApiKeyChange: (value: boolean) => void
}

export function GeminiApiKeyForm({
  apiKey,
  onApiKeyChange,
  shouldPersistApiKey,
  onShouldPersistApiKeyChange,
}: GeminiApiKeyFormProps) {
  // Open by default if no key is present, otherwise closed
  const [opened, setOpened] = useState(!apiKey)

  const hasKey = apiKey.trim().length > 0

  return (
    <Paper shadow="xs" withBorder radius="md" pos="relative">
      {/* Header / Toggle Area */}
      <UnstyledButton 
        onClick={() => setOpened((o) => !o)} 
        p="md" 
        w="100%"
        style={() => ({
          backgroundColor: opened ? 'transparent' : 'var(--mantine-color-gray-0)',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'var(--mantine-color-gray-1)',
          },
        })}
      >
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon variant="light" color={hasKey ? 'green' : 'blue'} size="md">
              <IconKey size={16} />
            </ThemeIcon>
            <Text fw={500} size="sm">Gemini API Configuration</Text>
          </Group>

          <Group gap="xs">
            {hasKey ? (
              <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={12}/>}>
                Configured
              </Badge>
            ) : (
              <Badge color="red" variant="light" size="sm" leftSection={<IconAlertCircle size={12}/>}>
                Missing Key
              </Badge>
            )}
            {opened ? <IconChevronUp size={16} color="gray" /> : <IconChevronDown size={16} color="gray" />}
          </Group>
        </Group>
      </UnstyledButton>

      {/* Collapsible Content */}
      <Collapse in={opened}>
        <div style={{ padding: '0 var(--mantine-spacing-md) var(--mantine-spacing-md) var(--mantine-spacing-md)' }}>
          <form onSubmit={event => event.preventDefault()}>
            <Stack gap="xs" pt="xs">
              <PasswordInput
                size='xs'
                label="Gemini API Key"
                placeholder="Paste your API key"
                value={apiKey}
                onChange={event => onApiKeyChange(event.currentTarget.value)}
                required
              />
              <Text size="xs" c="dimmed">
                You can get a free API key from{' '}
                <Anchor
                  size='xs'
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google AI Studio
                </Anchor>
                . The key is sent straight from your browser to Google—there is no intermediary server.
              </Text>
              
              <Switch
                label="Remember this API key on this device"
                description="When enabled, the key is stored in this browser's localStorage in plain text."
                checked={shouldPersistApiKey}
                onChange={event =>
                  onShouldPersistApiKeyChange(event.currentTarget.checked)
                }
                size='xs'
                mt="xs"
              />
              
              <Alert
                style={{ padding: '12px' }}
                color={shouldPersistApiKey ? 'yellow' : 'blue'}
                title={shouldPersistApiKey ? 'Stored in Local Storage' : 'Session only'}
              >
                {shouldPersistApiKey
                  ? 'Anyone with access to this browser profile can read or use your API key. Only opt in on trusted devices and beware of the security implications. '
                  : 'Your key stays in memory only for this tab. Refreshing or closing the page requires pasting it again, but nothing is written to disk. '}
                  <Anchor size="sm" href='https://en.wikipedia.org/wiki/Web_storage' target='_blank' rel='noreferrer'>Learn more</Anchor>
              </Alert>
              
              <Alert color="gray" style={{ padding: '12px' }}>
                  By using this web application, you agree to comply with Google's <Anchor size="sm" href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Terms of Service</Anchor> and Privacy Policy regarding the use of Gemini API. Any cost incurred from using the API is your responsibility.
              </Alert>
            </Stack>
          </form>
        </div>
      </Collapse>
    </Paper>
  )
}