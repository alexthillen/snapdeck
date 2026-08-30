import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { Dropzone, PDF_MIME_TYPE } from '@mantine/dropzone'
import {
  IconBook2,
  IconCoffee,
  IconDownload,
  IconFileText,
  IconInfoCircle,
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import SnapDeckLogo from '../assets/snapdeck_logo.svg'
import { LlmConfigurationForm } from '../components/LlmConfigurationForm'
import { CardReview } from '../components/CardReview'
import PrivacyModal from '../components/PrivacyModal'
import { useLlmSettings } from '../hooks/useLlmSettings'
import { getActiveLlmConfig, isLlmConfigReady } from '../utils/llm/config'
import { analyzePdf } from '../utils/llm/document'
import { createGenerationPlan } from '../documents/plan'
import type { AnalyzedDocument, CoverageLevel } from '../documents/types'
import type { CardType } from '../lib/parsers'
import {
  createPendingRuns,
  runGeneration,
  runGenerationUnit,
} from '../generation/runGeneration'
import type { DraftCard, UnitRun } from '../generation/types'
import { exportDraftCards } from '../utils/anki'

type AnalysisError = {
  id: string
  fileName: string
  message: string
}

const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

const statusColor: Record<UnitRun['status'], string> = {
  pending: 'gray',
  running: 'indigo',
  succeeded: 'green',
  'needs-review': 'yellow',
  failed: 'red',
}

export default function CreateDeckPage() {
  const { settings, setSettings } = useLlmSettings()
  const llmConfig = getActiveLlmConfig(settings)
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([])
  const [analysisErrors, setAnalysisErrors] = useState<AnalysisError[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [cardType, setCardType] = useState<CardType>('BASIC')
  const [coverage, setCoverage] = useState<CoverageLevel>('balanced')
  const [includeSubchapters, setIncludeSubchapters] = useState(true)
  const [excludedSectionIds, setExcludedSectionIds] = useState<Set<string>>(new Set())
  const [runs, setRuns] = useState<UnitRun[]>([])
  const [cards, setCards] = useState<DraftCard[]>([])
  const [generating, setGenerating] = useState(false)
  const [privacyOpened, setPrivacyOpened] = useState(false)
  const [modelOpened, setModelOpened] = useState(false)

  const resetResults = useCallback(() => {
    setRuns([])
    setCards([])
  }, [])

  const plan = useMemo(
    () =>
      createGenerationPlan(documents, {
        includeSubchapters,
        coverage,
        contextTokens: settings.contextTokens,
        excludedSectionIds,
      }),
    [coverage, documents, excludedSectionIds, includeSubchapters, settings.contextTokens],
  )

  const analyzeFiles = useCallback(async (files: File[]) => {
    const existing = new Set(documents.map(document => fileKey(document.file)))
    const pdfs = files.filter(
      file => file.type === 'application/pdf' && !existing.has(fileKey(file)),
    )
    if (!pdfs.length) {
      return
    }

    setAnalyzing(true)
    resetResults()
    const added: AnalyzedDocument[] = []
    const failures: AnalysisError[] = []
    for (const file of pdfs) {
      try {
        added.push(await analyzePdf(file))
      } catch (error) {
        failures.push({
          id: fileKey(file),
          fileName: file.name,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
    setDocuments(current => [...current, ...added])
    setAnalysisErrors(current => [...current, ...failures])
    if (!deckName.trim() && added.length) {
      setDeckName(added[0].title)
    }
    setAnalyzing(false)
  }, [deckName, documents, resetResults])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.some(file => file.type === 'application/pdf')) {
        event.preventDefault()
        void analyzeFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [analyzeFiles])

  const removeDocument = (id: string) => {
    setDocuments(current => current.filter(document => document.id !== id))
    resetResults()
  }

  const toggleSection = (id: string, included: boolean) => {
    setExcludedSectionIds(current => {
      const next = new Set(current)
      if (included) next.delete(id)
      else next.add(id)
      return next
    })
    resetResults()
  }

  const updateCardsFromRuns = (nextRuns: UnitRun[]) => {
    setCards(nextRuns.flatMap(run => run.cards))
  }

  const startGeneration = async () => {
    if (!deckName.trim() || !plan.totalCalls || !isLlmConfigReady(llmConfig)) {
      return
    }
    setGenerating(true)
    const pending = createPendingRuns(plan)
    setRuns(pending)
    setCards([])
    const completed = await runGeneration({
      plan,
      documents,
      config: llmConfig,
      cardType,
      coverage,
      onUpdate: nextRuns => {
        setRuns(nextRuns)
        updateCardsFromRuns(nextRuns)
      },
    })
    setRuns(completed)
    updateCardsFromRuns(completed)
    setGenerating(false)
  }

  const retryRun = async (run: UnitRun) => {
    const section = plan.sections.find(candidate => candidate.id === run.unit.sectionId)
    const document = documents.find(candidate => candidate.id === run.unit.documentId)
    if (!section || !document) return

    setRuns(current => current.map(candidate =>
      candidate.unit.id === run.unit.id ? { ...candidate, status: 'running' } : candidate,
    ))
    const retried = await runGenerationUnit({
      unit: run.unit,
      section,
      document,
      config: llmConfig,
      cardType,
      coverage,
    })
    const nextRuns = runs.map(candidate =>
      candidate.unit.id === retried.unit.id ? retried : candidate,
    )
    setRuns(nextRuns)
    const editedCards = new Map(cards.map(card => [card.id, card]))
    setCards(
      nextRuns.flatMap(candidate =>
        candidate.cards.map(card =>
          candidate.unit.id === retried.unit.id
            ? card
            : editedCards.get(card.id) ?? card,
        ),
      ),
    )
  }

  const completedRuns = runs.filter(run =>
    run.status === 'succeeded' || run.status === 'needs-review' || run.status === 'failed',
  ).length
  const failedRuns = runs.filter(run => run.status === 'failed')
  const includedCards = cards.filter(card => card.included)
  const hasOutline = documents.some(document => document.outline.length > 0)

  return (
    <Box className="app-background">
      <PrivacyModal opened={privacyOpened} onClose={() => setPrivacyOpened(false)} />
      <Modal
        opened={modelOpened}
        onClose={() => setModelOpened(false)}
        title={<Text fw={700}>AI model</Text>}
        size="lg"
        centered
        overlayProps={{ backgroundOpacity: 0.35, blur: 6 }}
      >
        <LlmConfigurationForm
          embedded
          settings={settings}
          onSettingsChange={value => {
            setSettings(value)
            resetResults()
          }}
        />
      </Modal>
      <Container size="xl" py={{ base: 'md', sm: 'xl' }}>
        <Group justify="space-between" className="app-header" mb="xl">
          <Group gap="sm">
            <Image src={SnapDeckLogo} alt="SnapDeck logo" h={34} w={34} />
            <Text fw={750} size="lg" lh={1}>SnapDeck</Text>
          </Group>
          <Group gap="md">
            <Button
              variant="subtle"
              color={isLlmConfigReady(llmConfig) ? 'dark' : 'orange'}
              size="sm"
              leftSection={<IconSettings size={15} />}
              onClick={() => setModelOpened(true)}
            >
              <Text span visibleFrom="sm">
                {isLlmConfigReady(llmConfig) ? 'Model ready' : 'Set up model'}
              </Text>
              <Text span hiddenFrom="sm">Model</Text>
            </Button>
            <Anchor className="header-privacy" component="button" size="sm" c="dimmed" onClick={() => setPrivacyOpened(true)}>
              Privacy
            </Anchor>
          </Group>
        </Group>

        <Stack gap="xl">
          <Box className="hero-copy">
            <Text className="eyebrow" mb="md">PDF to focused Anki cards</Text>
            <Title order={1}>Turn books and papers into a reviewable deck.</Title>
            <Text c="dimmed" size="lg" maw={700} mt="lg" mx="auto">
              Add one or many PDFs. SnapDeck finds chapters, plans context-safe sections, and lets you review every generated card before export.
            </Text>
          </Box>

          <Paper radius="xl" p={{ base: 'md', sm: 'lg' }} className="upload-stage">
            <Group justify="space-between" mb="sm" px="xs">
              <Text size="sm" c="dimmed">Drop, select, or paste multiple PDFs</Text>
              {analyzing && <Loader size="sm" />}
            </Group>
              <Dropzone
                onDrop={files => void analyzeFiles(files)}
                onReject={() => undefined}
                accept={PDF_MIME_TYPE}
                multiple
                disabled={analyzing || generating}
                className="document-dropzone"
              >
                <Group justify="center" gap="md" mih={116} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept><IconUpload size={34} /></Dropzone.Accept>
                  <Dropzone.Reject><IconX size={34} /></Dropzone.Reject>
                  <Dropzone.Idle>
                    <ThemeIcon size={48} radius="xl" variant="light"><IconFileText size={25} /></ThemeIcon>
                  </Dropzone.Idle>
                  <div>
                    <Text fw={650} size="lg">Choose your documents</Text>
                    <Text size="sm" c="dimmed">Large PDFs are split locally. Page images render only when needed.</Text>
                  </div>
                </Group>
              </Dropzone>
          </Paper>

          {(documents.length > 0 || analysisErrors.length > 0) && (
            <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }}>
              <Group justify="space-between" align="flex-start" mb="lg">
                <div>
                  <Text fw={700}>2 · Review the plan</Text>
                  <Text size="sm" c="dimmed">
                    Chapters come from PDF bookmarks. Documents without bookmarks use conservative page ranges.
                  </Text>
                </div>
                <Group gap="xs" className="plan-metrics">
                  <Text size="sm">{plan.includedPages}/{plan.totalPages} pages</Text>
                  <Text c="gray.4">·</Text>
                  <Text size="sm">≈{plan.totalTargetCards} cards</Text>
                  <Text c="gray.4">·</Text>
                  <Text size="sm">{plan.totalCalls} calls</Text>
                </Group>
              </Group>

              {analysisErrors.map(error => (
                <Alert key={error.id} color="red" title={error.fileName} mb="sm">
                  {error.message}
                </Alert>
              ))}

              <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
                <TextInput
                  label="Deck name"
                  value={deckName}
                  onChange={event => setDeckName(event.currentTarget.value)}
                />
                <div>
                  <Text size="sm" fw={500} mb={5}>Card type</Text>
                  <SegmentedControl
                    fullWidth
                    value={cardType}
                    onChange={value => {
                      setCardType(value as CardType)
                      resetResults()
                    }}
                    data={[{ label: 'Basic', value: 'BASIC' }, { label: 'Cloze', value: 'CLOZE' }]}
                  />
                </div>
                <div>
                  <Text size="sm" fw={500} mb={5}>Coverage</Text>
                  <SegmentedControl
                    fullWidth
                    value={coverage}
                    onChange={value => {
                      setCoverage(value as CoverageLevel)
                      resetResults()
                    }}
                    data={['concise', 'balanced', 'thorough'].map(value => ({
                      label: value[0].toUpperCase() + value.slice(1),
                      value,
                    }))}
                  />
                </div>
              </SimpleGrid>

              {hasOutline && (
                <Switch
                  checked={includeSubchapters}
                  onChange={event => {
                    setIncludeSubchapters(event.currentTarget.checked)
                    setExcludedSectionIds(new Set())
                    resetResults()
                  }}
                  label="Use subchapters"
                  description="Turn nested PDF bookmarks into independently generated sections."
                  mb="lg"
                />
              )}

              <Stack gap="md">
                {documents.map(document => {
                  const sections = plan.sections.filter(section => section.documentId === document.id)
                  return (
                    <Paper key={document.id} radius="md" p="md" className="document-plan">
                      <Group justify="space-between" mb="sm">
                        <Group gap="sm">
                          <ThemeIcon variant="white" color="indigo"><IconBook2 size={18} /></ThemeIcon>
                          <div>
                            <Text fw={650}>{document.title}</Text>
                            <Text size="xs" c="dimmed">
                              {document.pageCount} pages · {document.outline.length ? 'bookmarks found' : 'context-sized ranges'}
                            </Text>
                          </div>
                        </Group>
                        <Tooltip label="Remove document">
                          <ActionIcon variant="subtle" color="gray" onClick={() => removeDocument(document.id)}>
                            <IconTrash size={17} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      <Divider mb="xs" />
                      <Stack gap={4}>
                        {sections.map(section => (
                          <Group key={section.id} justify="space-between" wrap="nowrap" className="plan-row">
                            <Checkbox
                              checked={section.included}
                              onChange={event => toggleSection(section.id, event.currentTarget.checked)}
                              label={section.path.join(' › ')}
                            />
                            <Group gap="xs" wrap="nowrap">
                              <Text size="xs" c="dimmed">pp. {section.range.start + 1}–{section.range.end}</Text>
                              <Badge size="xs" variant="outline">≈{section.targetCards}</Badge>
                              {section.units.length > 1 && <Badge size="xs" color="orange">{section.units.length} calls</Badge>}
                            </Group>
                          </Group>
                        ))}
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>

              <Alert icon={<IconInfoCircle size={18} />} color="indigo" mt="lg">
                Context planning reserves 45% for instructions, image-token uncertainty, and output. No page is silently dropped.
              </Alert>

              <Group justify="flex-end" mt="lg">
                <Button
                  size="md"
                  leftSection={<IconSparkles size={18} />}
                  disabled={
                    analyzing || generating || !deckName.trim() || !plan.totalCalls || !isLlmConfigReady(llmConfig)
                  }
                  onClick={() => void startGeneration()}
                >
                  Generate ≈{plan.totalTargetCards} cards
                </Button>
              </Group>
            </Paper>
          )}

          {runs.length > 0 && (
            <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }}>
              <Group justify="space-between" mb="md">
                <div>
                  <Text fw={700}>3 · Generate by section</Text>
                  <Text size="sm" c="dimmed">Successful sections stay available if another section fails.</Text>
                </div>
                <Badge color={generating ? 'indigo' : failedRuns.length ? 'orange' : 'green'}>
                  {completedRuns}/{runs.length} complete
                </Badge>
              </Group>
              <Progress value={(completedRuns / runs.length) * 100} animated={generating} mb="md" />
              <Stack gap="xs">
                {runs.map(run => (
                  <Group key={run.unit.id} justify="space-between" className="run-row">
                    <div>
                      <Text size="sm" fw={600}>{run.documentTitle} · {run.sectionTitle}</Text>
                      <Text size="xs" c="dimmed">
                        pages {run.unit.range.start + 1}–{run.unit.range.end} · target ≈{run.unit.targetCards}
                        {run.error ? ` · ${run.error}` : ''}
                        {run.parseIssues.length
                          ? ` · ${run.parseIssues.length} response block${run.parseIssues.length === 1 ? '' : 's'} could not be parsed`
                          : ''}
                      </Text>
                    </div>
                    <Group gap="xs">
                      <Badge color={statusColor[run.status]} variant="light">{run.status}</Badge>
                      {(run.status === 'failed' || run.status === 'needs-review') && !generating && (
                        <ActionIcon variant="light" onClick={() => void retryRun(run)}>
                          <IconRefresh size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}

          {cards.length > 0 && !generating && (
            <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }}>
              <CardReview cards={cards} onCardsChange={setCards} />
              {failedRuns.length > 0 && (
                <Alert color="orange" mt="lg" title="Partial result">
                  {failedRuns.length} section call{failedRuns.length === 1 ? '' : 's'} failed. Retry them above, or export the explicitly included cards without those sections.
                </Alert>
              )}
              <Group justify="flex-end" mt="lg">
                <Button
                  size="md"
                  color="green"
                  leftSection={<IconDownload size={18} />}
                  disabled={!includedCards.length || generating}
                  onClick={() => exportDraftCards(deckName, cards)}
                >
                  Export {includedCards.length} cards
                </Button>
              </Group>
            </Paper>
          )}

          <Group justify="space-between" py="md" c="dimmed">
            <Text size="xs">All PDF analysis happens in this browser.</Text>
            <Group gap="xs">
              <Anchor component="button" size="xs" c="dimmed" onClick={() => setPrivacyOpened(true)}>
                Privacy
              </Anchor>
              <Text size="xs">·</Text>
              <Anchor
                size="xs"
                c="orange.7"
                fw={600}
                href="https://buymeacoffee.com/alexthilleq"
                target="_blank"
                rel="noreferrer"
              >
                <Group component="span" gap={4} wrap="nowrap">
                  <IconCoffee size={14} />
                  <span>Support SnapDeck</span>
                </Group>
              </Anchor>
            </Group>
          </Group>
        </Stack>
      </Container>
    </Box>
  )
}
