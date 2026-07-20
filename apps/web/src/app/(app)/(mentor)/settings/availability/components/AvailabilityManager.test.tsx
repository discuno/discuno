import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Availability } from '~/app/types/availability'

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateSchedule: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('~/app/(app)/(mentor)/settings/actions', () => ({
  updateSchedule: mocks.updateSchedule,
}))

import { AvailabilityManager } from './AvailabilityManager'

const initialAvailability: Availability = {
  id: '42',
  weeklySchedule: {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  },
  dateOverrides: [],
}

const renderWithQueryClient = (children: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>)
}

describe('availability draft saving', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps edits made while a save is in flight instead of overwriting them', async () => {
    let resolveUpdate: ((result: { success: true; data: Availability }) => void) | undefined
    let submittedAvailability = initialAvailability

    mocks.updateSchedule.mockImplementation(
      (availability: Availability) =>
        new Promise<{ success: true; data: Availability }>(resolve => {
          submittedAvailability = availability
          resolveUpdate = resolve
        })
    )
    const user = userEvent.setup()

    renderWithQueryClient(<AvailabilityManager initialAvailability={initialAvailability} />)

    await user.click(screen.getByRole('switch', { name: 'monday' }))
    await user.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(mocks.updateSchedule).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('switch', { name: 'tuesday' }))

    await act(async () => {
      resolveUpdate?.({ success: true, data: submittedAvailability })
    })

    await waitFor(() => expect(screen.getByText('Unsaved changes')).toBeTruthy())
    expect(screen.getByRole('switch', { name: 'tuesday' }).getAttribute('aria-checked')).toBe(
      'true'
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Availability saved', expect.any(Object))
  })
})
