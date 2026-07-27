import { useState } from 'react'
import {
  Alert,
  Anchor,
  Badge,
  Collapse,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSettings,
} from '@tabler/icons-react'
import {
  getActiveLlmConfig,
  isLlmConfigReady,
  type LlmProvider,
  type LlmSettings,
} from '../utils/llm/config'

type LlmConfigurationFormProps = {
  settings: LlmSettings
  onSettingsChange: (settings: LlmSettings) => void
}

export function LlmConfigurationForm({
  settings,
  onSettingsChange,
}: LlmConfigurationFormProps) {
  const configured = isLlmConfigReady(getActiveLlmConfig(settings))
  const [opened, setOpened] = useState(!configured)

  const setProvider = (provider: string) => {
    onSettingsChange({
      ...settings,
      provider: provider as LlmProvider,
    })
  }

  return (
    <Paper shadow="xs" withBorder radius="md" pos="relative">
      <UnstyledButton
        onClick={() => setOpened(current => !current)}
        p="md"
        w="100%"
      >
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon
              variant="light"
              color={configured ? 'green' : 'blue'}
              size="md"
            >
              <IconSettings size={16} />
            </ThemeIcon>
            <Text fw={500} size="sm">
              AI Model Configuration
            </Text>
          </Group>

          <Group gap="xs">
            <Badge
              color={configured ? 'green' : 'red'}
              variant="light"
              size="sm"
              leftSection={
                configured ? (
                  <IconCheck size={12} />
                ) : (
                  <IconAlertCircle size={12} />
                )
              }
            >
              {configured ? 'Ready' : 'Needs configuration'}
            </Badge>
            {opened ? (
              <IconChevronUp size={16} color="gray" />
            ) : (
              <IconChevronDown size={16} color="gray" />
            )}
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={opened}>
        <Stack
          gap="xs"
          p="md"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
        >
          <SegmentedControl
            value={settings.provider}
            onChange={setProvider}
            data={[
              { label: 'Google Gemini', value: 'gemini' },
              {
                label: 'OpenAI-compatible',
                value: 'openai-compatible',
              },
            ]}
            fullWidth
            size="xs"
          />

          {settings.provider === 'gemini' ? (
            <>
              <TextInput
                size="xs"
                label="Model"
                value={settings.gemini.model}
                onChange={event =>
                  onSettingsChange({
                    ...settings,
                    gemini: {
                      ...settings.gemini,
                      model: event.currentTarget.value,
                    },
                  })
                }
                required
              />
              <PasswordInput
                size="xs"
                label="Gemini API Key"
                placeholder="Paste your API key"
                value={settings.gemini.apiKey}
                onChange={event =>
                  onSettingsChange({
                    ...settings,
                    gemini: {
                      ...settings.gemini,
                      apiKey: event.currentTarget.value,
                    },
                  })
                }
                required
              />
              <Text size="xs" c="dimmed">
                Get an API key from{' '}
                <Anchor
                  size="xs"
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google AI Studio
                </Anchor>
                . SnapDeck sends the PDF directly from your browser to Google.
              </Text>
            </>
          ) : (
            <>
              <TextInput
                size="xs"
                label="Base URL"
                description="Include the API version, for example /v1."
                placeholder="http://127.0.0.1:8100/v1"
                value={settings.openAiCompatible.baseUrl}
                onChange={event =>
                  onSettingsChange({
                    ...settings,
                    openAiCompatible: {
                      ...settings.openAiCompatible,
                      baseUrl: event.currentTarget.value,
                    },
                  })
                }
                required
              />
              <TextInput
                size="xs"
                label="Model"
                placeholder="mlx-community/gemma-4-E4B-it-qat-4bit"
                value={settings.openAiCompatible.model}
                onChange={event =>
                  onSettingsChange({
                    ...settings,
                    openAiCompatible: {
                      ...settings.openAiCompatible,
                      model: event.currentTarget.value,
                    },
                  })
                }
                required
              />
              <PasswordInput
                size="xs"
                label="API Key"
                description="Optional for local servers without authentication."
                placeholder="Leave empty for your local MLX server"
                value={settings.openAiCompatible.apiKey}
                onChange={event =>
                  onSettingsChange({
                    ...settings,
                    openAiCompatible: {
                      ...settings.openAiCompatible,
                      apiKey: event.currentTarget.value,
                    },
                  })
                }
              />
              <Text size="xs" c="dimmed">
                SnapDeck extracts text and renders each PDF page in your browser,
                then sends both to the endpoint&apos;s <code>/responses</code>{' '}
                API. The endpoint must allow requests from this site using CORS.
              </Text>
            </>
          )}

          <Switch
            label="Remember API keys on this device"
            description="When enabled, keys are stored in this browser's localStorage in plain text."
            checked={settings.shouldPersistApiKeys}
            onChange={event =>
              onSettingsChange({
                ...settings,
                shouldPersistApiKeys: event.currentTarget.checked,
              })
            }
            size="xs"
            mt="xs"
          />

          <Alert
            p="sm"
            color={settings.shouldPersistApiKeys ? 'yellow' : 'blue'}
            title={
              settings.shouldPersistApiKeys
                ? 'Stored in local storage'
                : 'Session only'
            }
          >
            {settings.shouldPersistApiKeys
              ? 'Anyone with access to this browser profile can read or use the stored API keys.'
              : 'API keys stay in memory for this tab and are cleared when the page reloads.'}
          </Alert>
        </Stack>
      </Collapse>
    </Paper>
  )
}
