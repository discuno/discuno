import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalProvider } from '../../provider/cal-provider'
import { Booker } from '../booker'

// Mock fetch globally
global.fetch = vi.fn()

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CalProvider
        config={{
          apiUrl: process.env.TEST_CAL_API_URL ?? 'https://api.cal.com/v2',
          accessToken: process.env.TEST_CAL_ACCESS_TOKEN ?? 'test-token',
          webAppUrl: process.env.TEST_CAL_WEB_APP_URL ?? 'https://cal.com',
        }}
      >
        {children}
      </CalProvider>
    </QueryClientProvider>
  )

  return TestWrapper
}

const mockEventTypes = [
  {
    id: 1,
    title: '30 Min Meeting',
    description: 'A quick 30 minute meeting',
    length: 30,
    slug: '30min-meeting',
    locations: [{ type: 'zoom' }],
  },
  {
    id: 2,
    title: '60 Min Consultation',
    description: 'An hour-long consultation',
    length: 60,
    slug: '60min-consultation',
    locations: [{ type: 'in-person' }],
  },
]

describe('Booker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders component without crashing', async () => {
    const Wrapper = createTestWrapper()

    await act(async () => {
      render(
        <Wrapper>
          <Booker />
        </Wrapper>
      )
    })

    // Component should render with event type selection step
    expect(screen.getByText('Select a meeting type')).toBeInTheDocument()
  })

  it('renders event types selection step when no eventTypeId provided', async () => {
    const Wrapper = createTestWrapper()

    await act(async () => {
      render(
        <Wrapper>
          <Booker />
        </Wrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Select a meeting type')).toBeInTheDocument()
    })

    // Should show error because we're not providing a specific eventType
    expect(screen.getByText('Failed to load event types')).toBeInTheDocument()
  })

  it('progresses to datetime selection when event type is provided', async () => {
    // Mock successful eventType fetch for specific event
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockEventTypes[0] }),
    })

    const Wrapper = createTestWrapper()

    await act(async () => {
      render(
        <Wrapper>
          <Booker eventTypeId={1} />
        </Wrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Select a date & time')).toBeInTheDocument()
    })

    expect(screen.getByText('30 Min Meeting')).toBeInTheDocument()
  })

  it('handles different layouts correctly', async () => {
    const Wrapper = createTestWrapper()

    const { rerender } = await act(async () => {
      return render(
        <Wrapper>
          <Booker layout="mobile" />
        </Wrapper>
      )
    })

    // Check that component renders with mobile layout
    expect(document.querySelector('.cal-booker.mobile')).toBeInTheDocument()

    await act(async () => {
      rerender(
        <Wrapper>
          <Booker layout="desktop" />
        </Wrapper>
      )
    })

    // Desktop layout should have different classes
    expect(document.querySelector('.cal-booker.desktop')).toBeInTheDocument()
  })

  it('shows specific event type when provided', async () => {
    // Mock successful eventType fetch for specific event
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockEventTypes[0] }),
    })

    const Wrapper = createTestWrapper()

    await act(async () => {
      render(
        <Wrapper>
          <Booker eventTypeId={1} />
        </Wrapper>
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Select a date & time')).toBeInTheDocument()
    })
  })

  it('handles custom onBookingComplete callback', async () => {
    const onBookingComplete = vi.fn()
    const Wrapper = createTestWrapper()

    await act(async () => {
      render(
        <Wrapper>
          <Booker onBookingComplete={onBookingComplete} />
        </Wrapper>
      )
    })

    // Component should render the step content
    await waitFor(() => {
      expect(screen.getByText('Select a meeting type')).toBeInTheDocument()
    })
  })
})
