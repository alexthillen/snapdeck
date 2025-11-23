import { Modal } from '@mantine/core'
import Markdown from './Markdown'

export default function MarkdownModal({
  opened,
  content,
  onClose = () => {},
}: {
  opened: boolean
  content: string
  onClose: () => void
}) {
  return (
    <Modal opened={opened} onClose={onClose} size="xl">
      <Markdown>{content}</Markdown>
    </Modal>
  )
}
