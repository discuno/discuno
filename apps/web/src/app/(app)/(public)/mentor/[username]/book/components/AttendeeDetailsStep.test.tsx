import type { UseMutationResult } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { AttendeeDetailsStep } from './AttendeeDetailsStep'

const eventType: EventType = {
  id: 42,
  title: 'College decision conversation',
  length: 30,
  price: 0,
  currency: 'USD',
}

const validFormData: BookingFormData = {
  name: 'Student Name',
  email: 'student@example.com',
  phone: '+1 555 123 4567',
  topic: 'Choosing between two majors',
}

const createMutationResult = (mutate: () => void) =>
  ({
    isPending: false,
    mutate,
  }) as unknown as UseMutationResult<void, Error, void>

describe('AttendeeDetailsStep', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('reviews valid details before creating the booking', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    const onReviewChange = vi.fn()

    render(
      <AttendeeDetailsStep
        selectedEventType={eventType}
        selectedTimeSlot="2030-06-15T15:00:00.000Z"
        timeZone="America/New_York"
        formData={validFormData}
        setFormData={vi.fn()}
        setCurrentStep={vi.fn()}
        onReviewChange={onReviewChange}
        createBookingMutation={createMutationResult(mutate)}
        detailsLocked={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Review booking' }))

    expect(screen.getByRole('heading', { name: 'Review your session' })).toBeInTheDocument()
    expect(screen.getByText('Choosing between two majors')).toBeInTheDocument()
    expect(onReviewChange).toHaveBeenCalledWith(true)
    expect(mutate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirm session' }))
    expect(mutate).toHaveBeenCalledOnce()
  })

  it('keeps the student on details and focuses validation before review', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    const onReviewChange = vi.fn()

    render(
      <AttendeeDetailsStep
        selectedEventType={eventType}
        selectedTimeSlot="2030-06-15T15:00:00.000Z"
        timeZone="America/New_York"
        formData={{ name: '', email: '', phone: '', topic: '' }}
        setFormData={vi.fn()}
        setCurrentStep={vi.fn()}
        onReviewChange={onReviewChange}
        createBookingMutation={createMutationResult(mutate)}
        detailsLocked={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Review booking' }))

    expect(screen.getByRole('heading', { name: 'Your question and details' })).toBeInTheDocument()
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(onReviewChange).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('locks editing while preserving the paid-attempt retry action', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    const onReviewChange = vi.fn()
    const paidEventType = { ...eventType, price: 5000 }
    const mutation = createMutationResult(mutate)
    const { rerender } = render(
      <AttendeeDetailsStep
        selectedEventType={paidEventType}
        selectedTimeSlot="2030-06-15T15:00:00.000Z"
        timeZone="America/New_York"
        formData={validFormData}
        setFormData={vi.fn()}
        setCurrentStep={vi.fn()}
        onReviewChange={onReviewChange}
        createBookingMutation={mutation}
        detailsLocked={false}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Review booking' }))
    rerender(
      <AttendeeDetailsStep
        selectedEventType={paidEventType}
        selectedTimeSlot="2030-06-15T15:00:00.000Z"
        timeZone="America/New_York"
        formData={validFormData}
        setFormData={vi.fn()}
        setCurrentStep={vi.fn()}
        onReviewChange={onReviewChange}
        createBookingMutation={mutation}
        detailsLocked
      />
    )

    expect(screen.getByRole('button', { name: 'Edit details' })).toBeDisabled()
    expect(screen.getByText('Details locked for this payment attempt')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue to checkout' }))
    expect(mutate).toHaveBeenCalledOnce()
  })
})
