import { Modal, Title, Text, Anchor, Stack, Code } from '@mantine/core';

interface PrivacyModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ opened, onClose }: PrivacyModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Privacy Policy" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">Last Updated: {new Date().toLocaleDateString()}</Text>
        
        <Title order={4}>1. No Data Collection</Title>
        <Text size="sm">
          SnapDeck operates as a purely client-side application. We do not have a backend server, 
          and we do not collect, store, or view your uploaded files, generated decks, or API keys.
        </Text>

        <Title order={4}>2. API Key Storage</Title>
        <Text size="sm">
          Your Google Gemini API key remains on your device. If you opt to "Remember this key", 
          it is stored in your browser's <Code>localStorage</Code>. It is transmitted only to Google's 
          servers for the purpose of generating content and is never shared with SnapDeck developers.
        </Text>

        <Title order={4}>3. Third-Party Processing</Title>
        <Text size="sm">
          To generate flashcards, your content is sent directly from your browser to the Google Gemini API. 
          By using this service, you agree to Google's{' '}
          <Anchor href="https://ai.google.dev/gemini-api/terms" target="_blank">Terms of Service</Anchor> 
          {' '}and{' '}
          <Anchor href="https://policies.google.com/privacy" target="_blank">Privacy Policy</Anchor>.
        </Text>
      </Stack>
    </Modal>
  );
}