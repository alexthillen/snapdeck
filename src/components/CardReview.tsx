import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import type { DraftCard } from '../generation/types'
import { cardPreview } from '../cards/preview'
import Markdown from './Markdown'

type CardReviewProps = {
  cards: DraftCard[]
  onCardsChange: (cards: DraftCard[]) => void
}

export function CardReview({ cards, onCardsChange }: CardReviewProps) {
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? '')
  const [side, setSide] = useState<'front' | 'back'>('front')
  const selectedIndex = Math.max(0, cards.findIndex(card => card.id === selectedId))
  const selected = cards[selectedIndex]

  useEffect(() => {
    if (!cards.some(card => card.id === selectedId)) {
      setSelectedId(cards[0]?.id ?? '')
    }
  }, [cards, selectedId])

  const includedCount = useMemo(
    () => cards.filter(card => card.included).length,
    [cards],
  )

  if (!selected) {
    return null
  }

  const update = (changes: Partial<DraftCard>) => {
    onCardsChange(
      cards.map(card => (card.id === selected.id ? { ...card, ...changes } : card)),
    )
  }
  const preview = cardPreview(selected, side)

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2} size="h3">Review cards</Title>
          <Text size="sm" c="dimmed">
            Edit the final fields, flip the rendered card, or exclude weak cards before export.
          </Text>
        </div>
        <Badge size="lg" variant="light">
          {includedCount} of {cards.length} included
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper withBorder radius="lg" p="sm">
          <ScrollArea h={560} type="auto">
            <Stack gap={6}>
              {cards.map((card, index) => (
                <UnstyledButton
                  key={card.id}
                  onClick={() => {
                    setSelectedId(card.id)
                    setSide('front')
                  }}
                  p="sm"
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    border: card.id === selected.id
                      ? '1px solid var(--mantine-color-indigo-5)'
                      : '1px solid transparent',
                    background: card.id === selected.id
                      ? 'var(--mantine-color-indigo-0)'
                      : card.included
                        ? 'transparent'
                        : 'var(--mantine-color-gray-1)',
                    opacity: card.included ? 1 : 0.62,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Box style={{ minWidth: 0 }}>
                      <Text size="xs" c="dimmed">
                        {index + 1} · {card.documentTitle} · pages {card.pageRange.start + 1}–{card.pageRange.end}
                      </Text>
                      <Text size="sm" fw={600} lineClamp={2}>{card.front}</Text>
                    </Box>
                    <Badge size="xs" color={card.included ? 'green' : 'gray'}>
                      {card.cardType}
                    </Badge>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea>
        </Paper>

        <Stack gap="md">
          <Paper withBorder radius="lg" p="lg" className="card-preview-shell">
            <Group justify="space-between" mb="md">
              <SegmentedControl
                size="xs"
                value={side}
                onChange={value => setSide(value as 'front' | 'back')}
                data={[
                  { label: 'Front', value: 'front' },
                  { label: 'Back', value: 'back' },
                ]}
              />
              <Switch
                label="Include"
                checked={selected.included}
                onChange={event => update({ included: event.currentTarget.checked })}
              />
            </Group>
            <Divider mb="lg" />
            <Box mih={220}>
              <Markdown>{preview.primary}</Markdown>
              {preview.extra && (
                <>
                  <Divider my="lg" />
                  <Markdown>{preview.extra}</Markdown>
                </>
              )}
            </Box>
          </Paper>

          <Textarea
            autosize
            minRows={3}
            maxRows={8}
            label={selected.cardType === 'CLOZE' ? 'Text' : 'Front'}
            value={selected.front}
            onChange={event => update({ front: event.currentTarget.value })}
          />
          {selected.cardType === 'BASIC' && (
            <Textarea
              autosize
              minRows={3}
              maxRows={8}
              label="Back"
              value={selected.back ?? ''}
              onChange={event => update({ back: event.currentTarget.value })}
            />
          )}
          <Textarea
            autosize
            minRows={2}
            maxRows={6}
            label="Extra"
            value={selected.extra ?? ''}
            onChange={event => update({ extra: event.currentTarget.value })}
          />
          <SimpleGrid cols={2}>
            <TextInput
              label="Difficulty"
              value={selected.difficulty}
              onChange={event => update({ difficulty: event.currentTarget.value })}
            />
            <TextInput
              label="Tags"
              value={selected.tags.join(', ')}
              onChange={event => update({
                tags: event.currentTarget.value.split(',').map(tag => tag.trim()).filter(Boolean),
              })}
            />
          </SimpleGrid>
          <Group justify="space-between">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              disabled={selectedIndex === 0}
              onClick={() => setSelectedId(cards[selectedIndex - 1].id)}
            >
              Previous
            </Button>
            <Button
              variant="subtle"
              rightSection={<IconArrowRight size={16} />}
              disabled={selectedIndex === cards.length - 1}
              onClick={() => setSelectedId(cards[selectedIndex + 1].id)}
            >
              Next
            </Button>
          </Group>
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
