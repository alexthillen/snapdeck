import React, { useCallback, useMemo, useState } from 'react'
import { IconUpload, IconX, IconFileTypePdf, IconCoffee, IconCheck, IconInfoCircle } from '@tabler/icons-react'
import {
  Paper,
  TextInput,
  Button,
  Group,
  Text,
  Slider,
  SegmentedControl,
  ActionIcon,
  Alert,
  ThemeIcon,
} from '@mantine/core'
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { notify_error } from '../utils/notifications'
import {
  createBasicCard,
  createClozeCard,
  createDeck,
  saveDeckToFile,
  addCardToDeck,
} from '../utils/anki'
import { fileToBase64 } from '../utils/file'
import { buildPrompt } from '../utils/llm/prompts'
import { GeminiClient } from '../utils/llm/api'
import { parseLlmResponse } from '../utils/llm/parser'
import type { ParsedCard } from '../lib/parsers'

const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/alexthilleq'
type CardTypeSelection = 'BASIC' | 'CLOZE'

type DeckGenerationJob = {
  deckName: string
  file: File
  apiKey: string
  cardType: CardTypeSelection
  numCards: number
}

export default function CreateDeckForm({
  onClose,
  addEditedFormId,
  apiKey,
}: {
  onClose?: () => void
  addEditedFormId?: () => void
  apiKey: string
}) {
  const geminiClient = useMemo(() => new GeminiClient(), [])

  const [deckName, setDeckName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [numCards, setNumCards] = useState(25)
  const [cardType, setCardType] = useState('BASIC')
  const [showSuccessSupport, setShowSuccessSupport] = useState(false) // New state for support prompt

  const clearForm = useCallback(() => {
    setFile(null)
    setDeckName('')
    setNumCards(25)
    setCardType('BASIC')
  }, [])

  interface FileUploadEvent {
    length: number
    [index: number]: File
  }

  const handleFileUpload = (files: FileUploadEvent): void => {
    if (files && files.length > 0) {
      addEditedFormId?.()
      setFile(files[0])
      setShowSuccessSupport(false) // Hide support prompt when starting new action
      if (deckName.trim() === '') {
        setDeckName(files[0].name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const addParsedCardToDeck = useCallback((
    deck: ReturnType<typeof createDeck>,
    parsedCard: ParsedCard,
  ): boolean => {
    try {
      if (parsedCard.cardType === 'BASIC') {
        if (!parsedCard.back) {
          throw new Error('Basic card is missing a back field')
        }
        const note = createBasicCard(
          parsedCard.front,
          parsedCard.back,
          parsedCard.extra ?? '',
          parsedCard.difficulty ?? '',
        )
        addCardToDeck(deck, note, parsedCard.tags)
        return true
      }

      const note = createClozeCard(
        parsedCard.front,
        parsedCard.extra ?? '',
        parsedCard.difficulty ?? '',
      )
      addCardToDeck(deck, note, parsedCard.tags)
      return true
    } catch (error) {
      console.error('Failed to add parsed card to deck', error)
      return false
    }
  }, [])

  const runDeckGeneration = useCallback(async ({
    deckName,
    cardType,
    numCards,
    file,
    apiKey,
  }: DeckGenerationJob) => {
    const notificationId = `deck-generation-${Date.now()}`
    const cardTypeLabel = cardType === 'BASIC' ? 'basic' : 'cloze'

    notifications.show({
      id: notificationId,
      title: 'Generating deck',
      message: `Creating ${cardTypeLabel} cards from ${deckName}...`,
      color: 'blue',
      icon: <IconInfoCircle size={20} />,
      position: 'top-right',
      loading: true,
      autoClose: false,
      withCloseButton: false,
    })

    try {
      const base64Pdf = await fileToBase64(file)
      const prompt = await buildPrompt(cardType, numCards)
      const { text } = await geminiClient.generateContent({
        apiKey,
        base64Document: base64Pdf,
        prompt,
      })

      const parsed = parseLlmResponse(text)
      if (!parsed.cards.length) {
        throw new Error(
          'Gemini did not produce any valid cards. Try increasing the number or adjusting the PDF.',
        )
      }

      const deck = createDeck(deckName)
      let added = 0
      parsed.cards.forEach(card => {
        if (addParsedCardToDeck(deck, card)) {
          added += 1
        }
      })

      if (!added) {
        throw new Error(
          'No cards could be converted into a deck. Please review the LLM output and try again.',
        )
      }

      const filename = `${deckName.replace(/\s+/g, '_')}.apkg`
      saveDeckToFile(deck, filename)

      notifications.update({
        id: notificationId,
        title: 'Deck ready',
        message: `Deck (${deckName}) generated with ${added} cards. Downloading...`,
        color: 'green',
        icon: <IconCheck size={20} />,
        position: 'top-right',
        loading: false,
        autoClose: 6000,
        withCloseButton: true,
      })

      setShowSuccessSupport(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create deck.'
      try {
        notifications.update({
          id: notificationId,
          title: 'Generation failed',
          message,
          color: 'red',
          position: 'top-right',
          loading: false,
          autoClose: 6000,
          withCloseButton: true,
        })
      } catch {
        notify_error(message)
      }
    }
  }, [addParsedCardToDeck, geminiClient])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setShowSuccessSupport(false)

    try {
      const trimmedDeckName = deckName.trim()
      if (!trimmedDeckName) {
        throw new Error('Deck name cannot be empty.')
      }

      if (!file) {
        throw new Error('Please upload a PDF file.')
      }

      const trimmedApiKey = apiKey.trim()
      if (!trimmedApiKey) {
        throw new Error('Please provide your Gemini API key.')
      }
      const fileToProcess = file
      const job: DeckGenerationJob = {
        deckName: trimmedDeckName,
        file: fileToProcess,
        apiKey: trimmedApiKey,
        cardType: cardType as CardTypeSelection,
        numCards,
      }

      clearForm()
      void runDeckGeneration(job)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create deck.'
      notify_error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Paper shadow="sm" p="lg" withBorder radius={'md'} pos="relative">
      {onClose && (
        <Group justify="flex-end" m="0" p="0">
          <ActionIcon
            color="red"
            variant="transparent"
            onClick={onClose}
            m="0"
            p="0"
            disabled={isSubmitting}
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>
      )}

      <form onSubmit={handleSubmit}>
        <TextInput
          label="Deck Name"
          placeholder="Enter deck name"
          value={deckName}
          onChange={e => {
            setDeckName(e.target.value)
            addEditedFormId?.()
            setShowSuccessSupport(false) // Dismiss support if user types
          }}
          required
          mb="md"
        />

        <Text size="sm" fw={500} mb="xs">
          Upload PDF File
        </Text>

        <Dropzone
          onDrop={handleFileUpload}
          onReject={() =>
            notify_error(
              'Invalid file. Please upload a PDF file with a size of at most 10MB.',
            )
          }
          maxSize={10 * 1024 ** 2}
          accept={PDF_MIME_TYPE}
          multiple={false}
          mb="md"
        >
          <Group
            justify="center"
            gap="xl"
            style={{ minHeight: 120, pointerEvents: 'none' }}
          >
            <Dropzone.Accept>
              <IconUpload size="3.2rem" stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size="3.2rem" stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileTypePdf size="3rem" color="#e63946" />
            </Dropzone.Idle>
            <div>
              <Text size="xl" inline>
                Drag PDF here or click to select
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                File should not exceed 10MB
              </Text>
            </div>
          </Group>
        </Dropzone>

        {file && (
          <Text size="sm" c="green" mb="md">
            Selected file: {file.name}
          </Text>
        )}

        <Text size="sm" fw={500} mb="xs">
          Card Type
        </Text>
        <SegmentedControl
          value={cardType}
          onChange={setCardType}
          data={[
            { label: 'Basic Cards', value: 'BASIC' },
            { label: 'Cloze Cards (experimental)', value: 'CLOZE' },
          ]}
          mb="md"
          fullWidth
        />

        <Text size="sm" fw={500} mb="xs">
          Number of Cards: {numCards}
        </Text>
        <Slider
          min={5}
          max={25}
          step={5}
          value={numCards}
          onChange={setNumCards}
          marks={[5, 10, 15, 20, 25].map(v => ({
            value: v,
            label: String(v),
          }))}
          mb="xl"
          labelAlwaysOn
        />

        <Button
          type="submit"
          loading={isSubmitting}
          disabled={
            isSubmitting ||
            !deckName.trim() ||
            !file ||
            !apiKey.trim()
          }
          fullWidth
        >
          Create Deck
        </Button>
        
        {/* SUCCESS / SUPPORT PROMPT */}
        {showSuccessSupport ? (
          <Alert 
            variant="light" 
            color="green" 
            mt="md" 
            title="Deck Generated Successfully!"
            icon={<ThemeIcon color="green" variant="transparent"><IconCheck size={16}/></ThemeIcon>}
            withCloseButton
            onClose={() => setShowSuccessSupport(false)}
          >
             <Group justify="space-between" align="center">
                <Text size="sm">
                   Did this save you time? Consider supporting the development!
                </Text>
                <Button 
                    component="a" 
                    href={BUY_ME_A_COFFEE_URL} 
                    target="_blank"
                    leftSection={<IconCoffee size={16}/>}
                    size="xs"
                    color="orange"
                    variant="filled"
                >
                    Buy me a coffee
                </Button>
             </Group>
          </Alert>
        ) : (
          <Text size="xs" c="dimmed" ta="center" mt="sm">
             By generating this deck, you confirm you have the rights to use the uploaded content.
          </Text>
        )}
      </form>
    </Paper>
  )
}