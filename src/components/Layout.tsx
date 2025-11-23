import React, { useState } from 'react'
import {
  AppShell,
  Group,
  NavLink,
  Stack,
  Image,
  Title,
  Divider,
  Box,
  Burger,
} from '@mantine/core'
import { Link, useLocation } from 'react-router-dom'
import { IconPlus } from '@tabler/icons-react'
import SnapDeckLogo from '../assets/snapdeck_logo.png'
import Footer from './Footer'

type LayoutProps = {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const [navbarOpened, setNavbarOpened] = useState(false) // Add state for navbar toggle

  return (
    <AppShell
      navbar={{
        width: 300,
        breakpoint: 'sm', // Navbar collapses below 'sm' breakpoint (768px)
        collapsed: { mobile: !navbarOpened }, // Collapsed on mobile unless opened
      }}
      header={{ height: { base: 60, sm: 0 } }} // Header only visible on mobile (base) and hidden on sm+
      padding="md"
    >
      {/* Mobile Header - only visible on small screens */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Group>
              <Image src={SnapDeckLogo} alt="SnapDeck Logo" h={30} w="auto" />
              <Title order={3}>SnapDeck</Title>
            </Group>
          </Link>
          <Burger
            opened={navbarOpened}
            onClick={() => setNavbarOpened(!navbarOpened)}
            size="sm"
            hiddenFrom="sm"
          />
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="xs">
        <AppShell.Section>
          <Box visibleFrom="sm">
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Group>
                <Image src={SnapDeckLogo} alt="SnapDeck Logo" h={40} w="auto" />
                <Title order={2}>SnapDeck</Title>
              </Group>
            </Link>
            <Divider my="sm" />
          </Box>
        </AppShell.Section>
        <AppShell.Section grow>
          <Stack gap="xs">
            <NavLink
              component={Link}
              to="/"
              label="Create Deck"
              leftSection={<IconPlus size="1rem" />}
              active={location.pathname === '/'}
              variant="light"
              onClick={() => setNavbarOpened(false)}
            />
          </Stack>
        </AppShell.Section>
        <AppShell.Section>
          <Stack gap="xs"></Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Box style={{ minHeight: 'calc(100vh - 70px)' }}>{children}</Box>
        <Footer />
      </AppShell.Main>
    </AppShell>
  )
}

export default Layout
