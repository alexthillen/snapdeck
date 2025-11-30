import React from 'react'
import { Anchor, Box, Divider, Group, Stack, Text, ActionIcon, Tooltip } from '@mantine/core'
import { IconBrain, IconCoffee } from '@tabler/icons-react'
import PrivacyModal from './PrivacyModal'

// REPLACE THIS WITH YOUR ACTUAL URL
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/alexthilleq'

const Footer: React.FC = () => {
  const [privacyOpen, setPrivacyOpen] = React.useState(false)

  return (
    <Box style={{ bottom: 0, left: 0, right: 0, width: '100%' }}>
      <PrivacyModal opened={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <Divider />
      <Group justify="space-between" align="center" mt="md" visibleFrom="lg">
        <Text size="sm" c="dimmed">
          © {new Date().getFullYear()} SnapDeck. All rights reserved.
        </Text>
        
        <Group>
            <Anchor size="sm" c="dimmed" onClick={() => setPrivacyOpen(true)}>
            Privacy Policy
            </Anchor>
            {/* SEPARATOR */}
            <Text size="sm" c="dimmed">|</Text>
            <Tooltip label="Buy me a coffee">
                <ActionIcon 
                    component="a" 
                    href={BUY_ME_A_COFFEE_URL} 
                    target="_blank" 
                    variant="subtle" 
                    color="orange"
                >
                    <IconCoffee size={18} />
                </ActionIcon>
            </Tooltip>
        </Group>

        <Group gap="md">
          <Text size="sm" c="dimmed">
            Designed to remember
          </Text>
          <IconBrain size={16} color="var(--mantine-color-blue-6)" />
        </Group>
      </Group>

      <Stack align="center" gap="sm" mt="md" hiddenFrom="lg">
        <Text size="sm" c="dimmed">
          © {new Date().getFullYear()} SnapDeck. All rights reserved.
        </Text>

        <Group gap="md" justify="center">
          <Anchor size="sm" c="dimmed" onClick={() => setPrivacyOpen(true)}>
            Privacy Policy
          </Anchor>     
          <Text size="sm" c="dimmed">|</Text>
            <Tooltip label="Buy me a coffee">
                <ActionIcon 
                    component="a" 
                    href={BUY_ME_A_COFFEE_URL} 
                    target="_blank" 
                    variant="subtle" 
                    color="orange"
                >
                    <IconCoffee size={18} />
                </ActionIcon>
            </Tooltip>   
        </Group>

        <Group gap={4}>
          <Text size="sm" c="dimmed">
            Designed to remember
          </Text>
          <IconBrain size={16} color="var(--mantine-color-blue-6)" />
        </Group>
      </Stack>
    </Box>
  )
}

export default Footer