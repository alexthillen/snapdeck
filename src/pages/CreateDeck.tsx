import { useState } from 'react'
import CreateDeckForm from '../components/CreateDeckForm'
import { SectionWrapper } from '../components/SectionWrapper'
import { ActionIcon, Button, Stack, Text } from '@mantine/core'
import MarkdownModal from '../components/MarkdownModal'
import { IconHelp } from '@tabler/icons-react'
import { GeminiApiKeyForm } from '../components/GeminiApiKeyForm'
import { useGeminiApiKeyState } from '../hooks/useGeminiApiKey'

const helpMarkdown = `
## Best Practices for PDF Upload
**For optimal results, we recommend using relatively small PDFs (under 10MB) that focus on a specific topic or subject matter.** This helps ensure better processing quality and more coherent deck generation.

### My PDF file is too large - how can I reduce the size?
Large PDF files can slow down processing and may cause upload issues. Here are some solutions:
- **Compress your PDF** using free online tools:
  - [Smallpdf](https://smallpdf.com/compress-pdf)
  - [ILovePDF](https://www.ilovepdf.com/compress_pdf)

### My PDF has too many pages - what's the best approach?
Documents with many pages can be overwhelming and may not produce focused decks. Consider these options:
- **Split into topic-focused sections** using:
  - [ILovePDF Split Tool](https://www.ilovepdf.com/split_pdf)
  - [Smallpdf Split Tool](https://smallpdf.com/split-pdf)
- **Create separate decks** for each section or chapter
- **Tip**: Aim for around 30 pages for book-style content or up to 100 pages for lecture-style materials for the most coherent and focused presentation decks

### Can I upload images (.jpg) or PowerPoint files (.pptx)?
Currently, our platform only supports **PDF files** for deck creation. However, you can easily convert other formats:
- **For images**: Convert JPG/PNG to PDF using:
  - [ILovePDF JPG to PDF](https://www.ilovepdf.com/jpg_to_pdf)
  - [Smallpdf JPG to PDF](https://smallpdf.com/jpg-to-pdf)
- **For PowerPoint**: Export your .pptx as PDF directly from PowerPoint (File → Export → Create PDF/XPS)
- **Tip**: When converting images, arrange them in logical order before conversion for better deck flow
`

function CreateDeckPage() {
  const [showHelp, setShowHelp] = useState(false)
  const [formIds, setFormIds] = useState<number[]>([Date.now()])
  const [editedFormIds, setEditedFormIds] = useState<Set<number>>(new Set())
  const {
    apiKey,
    shouldPersistApiKey,
    setApiKey,
    setShouldPersistApiKey,
  } = useGeminiApiKeyState()

  const addForm = () => {
    // generate a new unique ID
    setFormIds(ids => [...ids, Date.now()])
  }

  const removeForm = (id: number) => {
    setFormIds(ids => ids.filter(existingId => existingId !== id))
  }

  return (
    <>
      <MarkdownModal
        content={helpMarkdown}
        opened={showHelp}
        onClose={() => setShowHelp(false)}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
          height: '0px',
        }}
      >
        <ActionIcon
          variant="subtle"
          color="blue.6"
          onClick={() => setShowHelp(true)}
          size="lg"
          style={{ marginTop: '-0.5rem', marginRight: '-0.5rem' }}
        >
          <IconHelp size="lg" />
        </ActionIcon>
      </div>

      <SectionWrapper
        title="Create New Deck"
        subtitle={
            <>
                Upload a PDF file and create your new Anki deck.
                <br />
                <Text span size="xs" c="dimmed">SnapDeck is an independent tool and is not affiliated with the Anki project.</Text>
            </>
        }
      >
        <Stack gap="xl">
          <GeminiApiKeyForm
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            shouldPersistApiKey={shouldPersistApiKey}
            onShouldPersistApiKeyChange={setShouldPersistApiKey}
          />

          {formIds.map(id => (
            <CreateDeckForm
              key={id}
              onClose={() => removeForm(id)}
              addEditedFormId={() =>
                setEditedFormIds(prev => new Set(prev).add(id))
              }
              apiKey={apiKey}
            />
          ))}
          {formIds.filter(id => !editedFormIds.has(id)).length === 0 && (
            <Button onClick={addForm} variant="light" color="gray.6">
              Add Another PDF Upload
            </Button>
          )}
        </Stack>
      </SectionWrapper>
    </>
  )
}

export default CreateDeckPage