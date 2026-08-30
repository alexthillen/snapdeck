import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  IconPlayerPlay,
  IconPlayerStop,
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
} from '../generation/runGeneration'
import type { DraftCard, UnitRun } from '../generation/types'
import { GenerationController } from '../generation/control'
import { exportDraftCards } from '../utils/anki'

type AnalysisError = {
  id: string
  fileName: string
  message: string
}

const mergeAnalysisErrors = (
  current: AnalysisError[],
  incoming: AnalysisError[],
): AnalysisError[] => {
  const errors = new Map(current.map(error => [error.id, error]))
  incoming.forEach(error => errors.set(error.id, error))
  return [...errors.values()]
}

const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

const statusColor: Record<UnitRun['status'], string> = {
  pending: 'gray',
  running: 'indigo',
  succeeded: 'green',
  'needs-review': 'yellow',
  failed: 'red',
  stopped: 'gray',
}

const reflectRequestedStops = (
  runs: UnitRun[],
  controller: GenerationController,
): UnitRun[] => runs.map(run => {
  if (run.status !== 'pending' && run.status !== 'running') return run

  const stopReason = controller.shouldStopSection(run.unit.sectionId)
    ? 'section'
    : controller.shouldStopAll()
      ? 'all'
      : undefined

  return stopReason
    ? { ...run, status: 'stopped', generatedCards: 0, stopReason }
    : run
})

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
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string>()
  const [privacyOpened, setPrivacyOpened] = useState(false)
  const [modelOpened, setModelOpened] = useState(false)
  const generationController = useRef<GenerationController | null>(null)
  const generationEpoch = useRef(0)

  const resetResults = useCallback(() => {
    generationEpoch.current += 1
    generationController.current?.stopAll()
    generationController.current = null
    setRuns([])
    setCards([])
    setGenerating(false)
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
    const pdfs = files.filter(file => {
      const key = fileKey(file)
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (!isPdf || existing.has(key)) return false
      existing.add(key)
      return true
    })
    if (!pdfs.length) {
      return
    }

    setAnalyzing(true)
    const attempted = new Set(pdfs.map(fileKey))
    setAnalysisErrors(current => current.filter(error => !attempted.has(error.id)))
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
    setAnalysisErrors(current => mergeAnalysisErrors(current, failures))
    if (!deckName.trim() && added.length) {
      setDeckName(added[0].title)
    }
    setAnalyzing(false)
  }, [deckName, documents])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.some(file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) {
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

  const setSectionsIncluded = (ids: string[], included: boolean) => {
    setExcludedSectionIds(current => {
      const next = new Set(current)
      ids.forEach(id => {
        if (included) next.delete(id)
        else next.add(id)
      })
      return next
    })
    resetResults()
  }

  const toggleSection = (id: string, included: boolean) => {
    setSectionsIncluded([id], included)
  }

  const updateCardsFromRuns = (nextRuns: UnitRun[]) => {
    setCards(current => {
      const edited = new Map(current.map(card => [card.id, card]))
      return nextRuns.flatMap(run =>
        run.cards.map(card => edited.get(card.id) ?? card),
      )
    })
  }

  const executeRuns = async (initialRuns: UnitRun[]) => {
    const controller = new GenerationController()
    const epoch = generationEpoch.current + 1
    generationEpoch.current = epoch
    generationController.current = controller
    setGenerating(true)
    setRuns(initialRuns)

    const completed = await runGeneration({
      plan,
      documents,
      config: llmConfig,
      cardType,
      coverage,
      initialRuns,
      controller,
      onUpdate: nextRuns => {
        if (generationEpoch.current !== epoch) return
        const visibleRuns = reflectRequestedStops(nextRuns, controller)
        setRuns(visibleRuns)
        updateCardsFromRuns(visibleRuns)
      },
    })

    if (generationEpoch.current !== epoch) return
    const visibleRuns = reflectRequestedStops(completed, controller)
    setRuns(visibleRuns)
    updateCardsFromRuns(visibleRuns)
    generationController.current = null
    setGenerating(false)
  }

  const startGeneration = async () => {
    if (!deckName.trim() || !plan.totalCalls || !isLlmConfigReady(llmConfig)) {
      return
    }
    const pending = createPendingRuns(plan)
    setCards([])
    await executeRuns(pending)
  }

  const exportCards = async () => {
    setExporting(true)
    setExportError(undefined)
    try {
      await exportDraftCards(deckName, cards)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error))
    } finally {
      setExporting(false)
    }
  }

  const stopAllGeneration = () => {
    generationController.current?.stopAll()
    setRuns(current => current.map(run =>
      run.status === 'pending' || run.status === 'running'
        ? { ...run, status: 'stopped', generatedCards: 0, stopReason: 'all' }
        : run,
    ))
  }

  const stopSectionGeneration = (sectionId: string) => {
    generationController.current?.stopSection(sectionId)
    setRuns(current => current.map(run =>
      run.unit.sectionId === sectionId &&
      (run.status === 'pending' || run.status === 'running')
        ? { ...run, status: 'stopped', generatedCards: 0, stopReason: 'section' }
        : run,
    ))
  }

  const resumeGeneration = async () => {
    const resumed = runs.map(run =>
      run.status === 'stopped' && run.stopReason === 'all'
        ? {
            ...run,
            status: 'pending' as const,
            generatedCards: 0,
            stopReason: undefined,
          }
        : run,
    )
    await executeRuns(resumed)
  }

  const restartSection = async (sectionId: string) => {
    if (generating) return
    const unitIds = new Set(
      runs
        .filter(run => run.unit.sectionId === sectionId)
        .map(run => run.unit.id),
    )
    const restarted = runs.map(run =>
      run.unit.sectionId === sectionId
        ? {
            ...run,
            status: 'pending' as const,
            cards: [],
            generatedCards: 0,
            parseIssues: [],
            rawResponse: undefined,
            error: undefined,
            stopReason: undefined,
          }
        : run,
    )
    setCards(current => current.filter(card => !unitIds.has(card.unitId)))
    await executeRuns(restarted)
  }

  const completedRuns = runs.filter(run =>
    run.status === 'succeeded' || run.status === 'needs-review' || run.status === 'failed',
  ).length
  const runTargetCards = runs.reduce((sum, run) => sum + run.unit.targetCards, 0)
  const stoppedRuns = runs.filter(run => run.status === 'stopped')
  const failedRuns = runs.filter(run => run.status === 'failed')
  const includedCards = cards.filter(card => card.included)
  const hasOutline = documents.some(document => document.outline.length > 0)
  const chapterRuns = useMemo(() => {
    const grouped = new Map<string, UnitRun[]>()
    runs.forEach(run => {
      const sectionRuns = grouped.get(run.unit.sectionId) ?? []
      sectionRuns.push(run)
      grouped.set(run.unit.sectionId, sectionRuns)
    })

    return Array.from(grouped.entries()).map(([sectionId, sectionRuns]) => {
      const status: UnitRun['status'] = sectionRuns.some(run => run.status === 'running')
        ? 'running'
        : sectionRuns.some(run => run.status === 'pending')
          ? 'pending'
          : sectionRuns.some(run => run.status === 'stopped')
            ? 'stopped'
            : sectionRuns.some(run => run.status === 'failed')
              ? 'failed'
              : sectionRuns.some(run => run.status === 'needs-review')
                ? 'needs-review'
                : 'succeeded'
      return {
        sectionId,
        title: sectionRuns[0].sectionTitle,
        documentTitle: sectionRuns[0].documentTitle,
        runs: sectionRuns,
        status,
        targetCards: sectionRuns.reduce((sum, run) => sum + run.unit.targetCards, 0),
        generatedCards: sectionRuns.reduce(
          (sum, run) => sum + (
            run.status === 'running' ? (run.generatedCards ?? 0) : run.cards.length
          ),
          0,
        ),
        startPage: Math.min(...sectionRuns.map(run => run.unit.range.start + 1)),
        endPage: Math.max(...sectionRuns.map(run => run.unit.range.end)),
        parseIssues: sectionRuns.reduce((sum, run) => sum + run.parseIssues.length, 0),
        error: sectionRuns.find(run => run.error)?.error,
      }
    })
  }, [runs])
  const generationProgress = runs.length
    ? runs.reduce((sum, run) => {
        if (
          run.status === 'succeeded' ||
          run.status === 'needs-review' ||
          run.status === 'failed'
        ) return sum + 1
        if (run.status === 'running') {
          return sum + Math.min((run.generatedCards ?? 0) / Math.max(run.unit.targetCards, 1), 0.95)
        }
        return sum
      }, 0) / runs.length * 100
    : 0
  const canResume = stoppedRuns.some(run => run.stopReason === 'all')

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
                onReject={rejections => setAnalysisErrors(current => mergeAnalysisErrors(
                  current,
                  rejections.map(({ file }) => ({
                    id: fileKey(file),
                    fileName: file.name,
                    message: 'Choose a PDF file.',
                  })),
                ))}
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
                  const hasIncludedSections = sections.some(section => section.included)
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
                        <Group gap="xs">
                          <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            onClick={() => setSectionsIncluded(
                              sections.map(section => section.id),
                              !hasIncludedSections,
                            )}
                          >
                            {hasIncludedSections ? 'Deselect all' : 'Select all'}
                          </Button>
                          <Tooltip label="Remove document">
                            <ActionIcon variant="subtle" color="gray" onClick={() => removeDocument(document.id)}>
                              <IconTrash size={17} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                      <Divider mb="xs" />
                      <Stack gap={2} className="section-list-scroll">
                        {sections.map(section => {
                          const sectionPath = section.path.join(' › ')
                          return (
                            <Box key={section.id} className="plan-row">
                              <Checkbox
                                checked={section.included}
                                onChange={event => toggleSection(section.id, event.currentTarget.checked)}
                                aria-label={sectionPath}
                              />
                              <Tooltip label={sectionPath} openDelay={450} multiline maw={420}>
                                <Text
                                  className="plan-row-title"
                                  size="sm"
                                  fw={500}
                                  tabIndex={0}
                                >
                                  {sectionPath}
                                </Text>
                              </Tooltip>
                              <Text className="plan-row-pages" size="xs" c="dimmed">
                                pp. {section.range.start + 1}–{section.range.end}
                              </Text>
                              <Badge className="plan-row-cards" size="xs" variant="outline">
                                ≈{section.targetCards}
                              </Badge>
                              <Box className="plan-row-calls">
                                {section.units.length > 1 && (
                                  <Tooltip label={`${section.units.length} model calls`}>
                                    <Badge size="xs" color="orange">{section.units.length} calls</Badge>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          )
                        })}
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
                  <Text size="sm" c="dimmed">Completed chapters stay available when you stop, resume, or restart another chapter.</Text>
                </div>
                <Group gap="xs">
                  <Badge color={generating ? 'indigo' : failedRuns.length ? 'orange' : 'green'}>
                    {cards.length}/≈{runTargetCards} cards · {completedRuns}/{runs.length} calls
                  </Badge>
                  {generating ? (
                    <Button
                      size="compact-sm"
                      color="red"
                      variant="light"
                      leftSection={<IconPlayerStop size={15} />}
                      onClick={stopAllGeneration}
                    >
                      Stop all
                    </Button>
                  ) : canResume ? (
                    <Button
                      size="compact-sm"
                      variant="light"
                      leftSection={<IconPlayerPlay size={15} />}
                      onClick={() => void resumeGeneration()}
                    >
                      Resume remaining
                    </Button>
                  ) : null}
                </Group>
              </Group>
              <Progress value={generationProgress} animated={generating} mb="md" />
              <Stack gap="sm">
                {chapterRuns.map(chapter => (
                  <Paper key={chapter.sectionId} withBorder radius="md" p="sm" className="chapter-run">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <div>
                        <Text size="sm" fw={650}>{chapter.documentTitle} · {chapter.title}</Text>
                        <Text size="xs" c="dimmed">
                          pages {chapter.startPage}–{chapter.endPage} · {chapter.generatedCards}/≈{chapter.targetCards} cards
                          {chapter.runs.length > 1 ? ` · ${chapter.runs.length} calls` : ''}
                          {chapter.error ? ` · ${chapter.error}` : ''}
                          {chapter.parseIssues
                            ? ` · ${chapter.parseIssues} malformed card block${chapter.parseIssues === 1 ? '' : 's'}`
                            : ''}
                        </Text>
                      </div>
                      <Group gap="xs" wrap="nowrap">
                        <Badge color={statusColor[chapter.status]} variant="light">
                          {chapter.status.replace('-', ' ')}
                        </Badge>
                        {generating && chapter.runs.some(run =>
                          run.status === 'running' || run.status === 'pending'
                        ) ? (
                          <Button
                            size="compact-xs"
                            color="red"
                            variant="subtle"
                            leftSection={<IconPlayerStop size={14} />}
                            onClick={() => stopSectionGeneration(chapter.sectionId)}
                          >
                            Stop
                          </Button>
                        ) : !generating ? (
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            leftSection={<IconRefresh size={14} />}
                            onClick={() => void restartSection(chapter.sectionId)}
                          >
                            Restart
                          </Button>
                        ) : null}
                      </Group>
                    </Group>
                    <Progress
                      mt="xs"
                      size="xs"
                      color={statusColor[chapter.status]}
                      animated={chapter.status === 'running'}
                      value={
                        chapter.status === 'succeeded' ||
                        chapter.status === 'needs-review' ||
                        chapter.status === 'failed'
                          ? 100
                          : Math.min(chapter.generatedCards / Math.max(chapter.targetCards, 1) * 100, 95)
                      }
                    />
                  </Paper>
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
              {exportError && (
                <Alert color="red" mt="lg" title="Could not export deck">
                  {exportError}
                </Alert>
              )}
              <Group justify="flex-end" mt="lg">
                <Button
                  size="md"
                  color="green"
                  leftSection={<IconDownload size={18} />}
                  disabled={!includedCards.length || generating || exporting}
                  loading={exporting}
                  onClick={() => void exportCards()}
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
                c="dimmed"
                href="https://github.com/alexthillen/snapdeck"
                target="_blank"
                rel="noreferrer"
              >
                Source
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
