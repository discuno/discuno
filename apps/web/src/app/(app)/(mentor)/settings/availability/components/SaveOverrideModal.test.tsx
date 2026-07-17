import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Availability, DateOverride } from '~/app/types/availability'
import { SaveOverrideModal } from './SaveOverrideModal'

const override: DateOverride = {
  date: '2026-07-20',
  intervals: [{ start: '09:00', end: '17:00' }],
}

const availability: Availability = {
  id: '42',
  weeklySchedule: {
    sunday: [],
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  },
  dateOverrides: [override],
}

describe('date exception dialog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('labels each time input and blocks an invalid range', () => {
    render(
      <SaveOverrideModal
        isOpen
        onClose={vi.fn()}
        overrideToEdit={override}
        currentAvailability={availability}
        onSave={vi.fn()}
      />
    )

    const endInput = screen.getByLabelText('End for date exception time window 1')
    fireEvent.change(endInput, { target: { value: '08:00' } })

    expect(screen.getByText('Each end time must be later than its start time.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Update draft' }).hasAttribute('disabled')).toBe(true)
  })

  it('confirms before discarding dirty dialog state and saves only to the parent draft', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(
      <SaveOverrideModal
        isOpen
        onClose={onClose}
        overrideToEdit={override}
        currentAvailability={availability}
        onSave={onSave}
      />
    )

    fireEvent.change(screen.getByLabelText('End for date exception time window 1'), {
      target: { value: '18:00' },
    })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.getByRole('alertdialog', { name: 'Discard this date exception draft?' })
    ).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))

    await user.click(screen.getByRole('button', { name: 'Update draft' }))

    expect(onSave).toHaveBeenCalledWith([
      { date: '2026-07-20', intervals: [{ start: '09:00', end: '18:00' }] },
    ])
    expect(onClose).toHaveBeenCalledOnce()
  })
})
