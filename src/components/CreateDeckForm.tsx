import React, { useMemo, useState } from 'react'
import { IconUpload, IconX, IconFileTypePdf, IconCoffee, IconCheck } from '@tabler/icons-react'
import {
  Paper,
  TextInput,
  Button,
  Group,
  Text,
  Slider,
  SegmentedControl,
  LoadingOverlay,
  ActionIcon,
  Alert,
  ThemeIcon,
} from '@mantine/core'
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone'
import { notify_error, notify_success } from '../utils/notifications'
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
  const [loading, setLoading] = useState(false)
  const [numCards, setNumCards] = useState(25)
  const [cardType, setCardType] = useState('BASIC')
  const [showSuccessSupport, setShowSuccessSupport] = useState(false) // New state for support prompt

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

  const addParsedCardToDeck = (
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
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setShowSuccessSupport(false)

    try {
      if (!deckName.trim()) {
        throw new Error('Deck name cannot be empty.')
      }

      if (!file) {
        throw new Error('Please upload a PDF file.')
      }

      const trimmedApiKey = apiKey.trim()
      if (!trimmedApiKey) {
        throw new Error('Please provide your Gemini API key.')
      }

      const base64Pdf = await fileToBase64(file)
      const prompt = await buildPrompt(cardType as 'BASIC' | 'CLOZE', numCards)
      const { text } = await geminiClient.generateContent({
        apiKey: trimmedApiKey,
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

      const skipped = parsed.errors.length
      const extraMsg = skipped
        ? ` ${skipped} card${skipped === 1 ? '' : 's'} were skipped because of formatting issues.`
        : ''
      notify_success(
        `Deck (${deckName}) generated with ${added} cards.${extraMsg}`,
        6000,
      )

      // Reset form and show support prompt
      setFile(null)
      setDeckName('')
      setNumCards(25)
      setCardType('BASIC')
      setShowSuccessSupport(true)

    } catch (err) {
      if (err instanceof Error) {
        notify_error(err.message)
      } else {
        notify_error('Failed to create deck.')
      }
    } finally {
      setLoading(false)
    }
  }
  
  const loadingText = (  <Alert style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "hsla(0, 0%, 100%, 0.14)" }}>
    <Text style={{ textAlign: "center", marginTop: "15rem", color: 'var(--mantine-color-blue-6)'}} size='lg' >
      You can keep this form running and simultaneously generate another deck
      by clicking the button below.
    </Text>
  </Alert>)

  return (
    <Paper shadow="sm" p="lg" withBorder radius={'md'} pos="relative">
      <LoadingOverlay
        visible={loading}
        zIndex={5}
        overlayProps={{ blur: 0.8, children: loadingText}}
        loaderProps={{ size: 'xl', color: 'var(--mantine-color-blue-6)' }}
      />
      {onClose && (
        <Group justify="flex-end" m="0" p="0">
          <ActionIcon
            color="red"
            variant="transparent"
            onClick={onClose}
            m="0"
            p="0"
            disabled={loading}
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
          loading={loading}
          disabled={
            loading ||
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