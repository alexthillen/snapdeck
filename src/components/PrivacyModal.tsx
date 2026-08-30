import { Modal, Title, Text, Anchor, Stack, Code } from '@mantine/core';

interface PrivacyModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ opened, onClose }: PrivacyModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Privacy Policy" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">Last updated: August 30, 2026</Text>
        
        <Title order={4}>1. Local Document Processing</Title>
        <Text size="sm">
          SnapDeck operates as a purely client-side application. We do not have a backend server, 
          and we do not collect, store, or view your uploaded files, generated decks, or API keys.
        </Text>

        <Title order={4}>2. API Key Storage</Title>
        <Text size="sm">
          Your API keys remain on your device. If you opt to remember them,
          they are stored in your browser&apos;s <Code>localStorage</Code>.
          Keys are sent only to the AI endpoint you configure and are never
          shared with SnapDeck developers.
        </Text>

        <Title order={4}>3. Third-Party Processing</Title>
        <Text size="sm">
          To generate flashcards, your content is sent directly from your
          browser to your selected provider. Both Gemini and OpenAI-compatible
          endpoints receive extracted text and rendered page images produced
          from the PDF in your browser. The original PDF file is not uploaded.
          If you use Gemini, you agree
          to Google&apos;s{' '}
          <Anchor href="https://ai.google.dev/gemini-api/terms" target="_blank">
            Terms of Service
          </Anchor>{' '}
          and{' '}
          <Anchor href="https://policies.google.com/privacy" target="_blank">
            Privacy Policy
          </Anchor>
          .
        </Text>

        <Title order={4}>4. Anonymous Usage Analytics</Title>
        <Text size="sm">
          SnapDeck may use Cloudflare Web Analytics to count page views and
          measure page performance. Cloudflare describes this service as
          privacy-first: it does not use cookies, local storage, or individual
          fingerprinting. Analytics never include your PDFs, generated cards,
          prompts, or API keys. See Cloudflare&apos;s{' '}
          <Anchor href="https://www.cloudflare.com/privacypolicy/" target="_blank">
            Privacy Policy
          </Anchor>
          .
        </Text>
      </Stack>
    </Modal>
  );
}
