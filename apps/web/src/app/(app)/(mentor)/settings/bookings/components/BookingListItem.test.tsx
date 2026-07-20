import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from './booking-types'

const mocks = vi.hoisted(() => ({
  cancelBooking: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('~/app/(app)/(mentor)/settings/actions', () => ({
  cancelBooking: mocks.cancelBooking,
}))

import { BookingListItem } from './BookingListItem'

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 1,
  calcomBookingId: 101,
  calcomUid: 'booking-1',
  title: 'How should I choose between two majors?',
  description: null,
  startTime: new Date(Date.now() + 60 * 60 * 1000),
  endTime: new Date(Date.now() + 90 * 60 * 1000),
  status: 'ACCEPTED',
  meetingUrl: 'https://meet.example.com/booking-1',
  attendeeName: 'Student One',
  attendeeEmail: 'student@example.com',
  attendeeTimeZone: 'America/New_York',
  createdAt: new Date(),
  ...overrides,
})

const renderWithQueryClient = (children: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>)
}

describe('mentor booking list item', () => {
  beforeEach(() => vi.clearAllMocks())

  it('treats a false cancellation result as an error instead of showing success', async () => {
    mocks.cancelBooking.mockResolvedValue({
      success: false,
      error: 'The provider could not cancel this session.',
    })
    const user = userEvent.setup()

    renderWithQueryClient(<BookingListItem booking={makeBooking()} timeZone="America/New_York" />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel session' }))

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Couldn't cancel the session", {
        description: 'The provider could not cancel this session.',
      })
    )
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('hides join and cancellation actions after the session has ended', () => {
    renderWithQueryClient(
      <BookingListItem
        booking={makeBooking({
          startTime: new Date(Date.now() - 90 * 60 * 1000),
          endTime: new Date(Date.now() - 60 * 60 * 1000),
        })}
        timeZone="America/New_York"
      />
    )

    expect(screen.queryByRole('link', { name: 'Join' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })

  it('shows an explicit status and timezone without actions for a cancelled session', () => {
    renderWithQueryClient(
      <BookingListItem booking={makeBooking({ status: 'CANCELLED' })} timeZone="America/New_York" />
    )

    expect(screen.getByLabelText('Booking status: Cancelled')).not.toBeNull()
    expect(screen.getByText('America/New York')).not.toBeNull()
    expect(screen.queryByRole('link', { name: 'Join' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })
})
