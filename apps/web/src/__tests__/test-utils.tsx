import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { type Session } from 'next-auth'
import { vi } from 'vitest'

// Mock session for testing
export const mockSession: Session = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: '2025-12-31',
}

// Create a test QueryClient with disabled retries and caching
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null
  queryClient?: QueryClient
}

export const renderWithProviders = (
  ui: ReactElement,
  { session = mockSession, queryClient = createTestQueryClient(), ...renderOptions }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>{children}</SessionProvider>
    </QueryClientProvider>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Common test helpers
export const mockNextRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

// Mock fetch for API testing
export const mockFetch = (response: any, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => response,
    text: async () => JSON.stringify(response),
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
  })
}

// Database mock helpers
export const mockDatabase = {
  users: new Map(),
  bookings: new Map(),
  eventTypes: new Map(),

  reset() {
    this.users.clear()
    this.bookings.clear()
    this.eventTypes.clear()
  },

  addUser(user: any) {
    this.users.set(user.id, user)
    return user
  },

  addBooking(booking: any) {
    this.bookings.set(booking.id, booking)
    return booking
  },

  addEventType(eventType: any) {
    this.eventTypes.set(eventType.id, eventType)
    return eventType
  },
}
