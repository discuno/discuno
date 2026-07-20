import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '~/app/(app)/(mentor)/settings/bookings/components/booking-types'

const mocks = vi.hoisted(() => ({
  getBookings: vi.fn(),
}))

vi.mock('~/app/(app)/(mentor)/settings/actions', () => ({
  getBookings: mocks.getBookings,
}))

vi.mock('~/app/(app)/(mentor)/settings/bookings/components/BookingListItem', () => ({
  BookingListItem: ({ booking }: { booking: Booking }) => (
    <div role="listitem">{booking.title}</div>
  ),
}))

import { TodaySessions } from './TodaySessions'

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 1,
  calcomBookingId: 101,
  calcomUid: 'booking-1',
  title: 'Should I change majors before recruiting?',
  description: null,
  startTime: new Date(Date.now() + 60 * 60 * 1000),
  endTime: new Date(Date.now() + 90 * 60 * 1000),
  status: 'ACCEPTED',
  meetingUrl: null,
  attendeeName: 'Student One',
  attendeeEmail: 'student@example.com',
  attendeeTimeZone: 'America/New_York',
  createdAt: new Date(),
  ...overrides,
})

const renderWithQueryClient = (children: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>)
}

describe('Today sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows upcoming student questions without mixing in finished sessions', async () => {
    mocks.getBookings.mockResolvedValue({
      success: true,
      data: [
        makeBooking(),
        makeBooking({
          id: 2,
          calcomUid: 'booking-2',
          title: 'A finished question',
          startTime: new Date(Date.now() - 90 * 60 * 1000),
          endTime: new Date(Date.now() - 60 * 60 * 1000),
        }),
      ],
    })

    renderWithQueryClient(<TodaySessions />)

    expect(await screen.findByText('Should I change majors before recruiting?')).toBeVisible()
    expect(screen.queryByText('A finished question')).toBeNull()
    expect(screen.getByRole('link', { name: /view all sessions/i })).toHaveAttribute(
      'href',
      '/settings/bookings'
    )
  })

  it('uses a quiet empty state when there is nothing upcoming', async () => {
    mocks.getBookings.mockResolvedValue({ success: true, data: [] })

    renderWithQueryClient(<TodaySessions />)

    expect(await screen.findByText('No upcoming sessions')).toBeVisible()
    expect(screen.getByText('New bookings will appear here.')).toBeVisible()
  })
})
