// components/SectionWrapper.tsx
import { Title, Text, Divider, Stack, Container } from '@mantine/core'
import type { TextProps } from '@mantine/core'
import React from 'react'

interface SectionWrapperProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  children?: React.ReactNode
  align?: TextProps['ta'] // 'ta' stands for textAlign
  divider?: boolean
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function SectionWrapper({
  title,
  subtitle,
  children,
  align = 'center',
  divider = true,
  gap = 'md',
}: SectionWrapperProps) {
  return (
    <Container py="lg" px="xs">
      <Stack gap={gap}>
        <div>
          <Title order={1} size="h1" ta={align} mb="md">
            {title}
          </Title>
          {subtitle && (
            <Text size="lg" ta={align} c="dimmed" maw={600} mx="auto">
              {subtitle}
            </Text>
          )}
        </div>
        {divider && <Divider />}
        {children}
      </Stack>
    </Container>
  )
}
