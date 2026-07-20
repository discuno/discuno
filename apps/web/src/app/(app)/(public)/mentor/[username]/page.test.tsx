import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getEventTypes: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('not found')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}))

vi.mock('~/components/shared/DecisionContext', () => ({
  DecisionContext: () => <p>Your saved question</p>,
}))

vi.mock('~/server/queries/profiles', () => ({
  getPublicProfileByUsername: mocks.getProfile,
}))

vi.mock('~/server/queries/event-types', () => ({
  getMentorEnabledEventTypesWithStripeStatus: mocks.getEventTypes,
}))

import MentorProfilePage from './page'

const profile = {
  userId: '5dd58726-09b3-4ec5-b3d9-9c6bd9102a1d',
  userProfileId: 12,
  username: 'alex-kim',
  email: null,
  emailVerified: true,
  schoolEmailVerified: true,
  bio: 'I switched into computer science and can help you compare the tradeoffs before recruiting.',
  schoolYear: 'Senior',
  graduationYear: 2027,
  image: null,
  name: 'Alex Kim',
  school: 'University of Michigan',
  major: 'Computer Science',
  calcomUserId: '12345',
  calcomUsername: 'alex-kim',
}

const eventTypes = [
  {
    calcomEventTypeId: 101,
    title: 'Major decision',
    description: 'Talk through the options and tradeoffs you are weighing.',
    duration: 30,
    customPrice: 0,
    currency: 'USD',
  },
  {
    calcomEventTypeId: 202,
    title: 'Internship questions',
    description: null,
    duration: 20,
    customPrice: 1500,
    currency: 'USD',
  },
]

describe('MentorProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getProfile.mockResolvedValue(profile)
    mocks.getEventTypes.mockResolvedValue(eventTypes)
  })

  it('offers one event-specific booking path per available session', async () => {
    render(
      await MentorProfilePage({
        params: Promise.resolve({ username: 'alex-kim' }),
        searchParams: Promise.resolve({ returnTo: '/find?school=umich#mentors' }),
      })
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Alex Kim' })).toBeInTheDocument()
    expect(screen.getByText(profile.bio)).toBeInTheDocument()
    expect(screen.getByText('School email confirmed')).toBeInTheDocument()

    const sessionHeading = screen.getByRole('heading', { level: 2, name: 'Choose a session' })
    const sessionSection = sessionHeading.closest('section')
    expect(sessionSection).not.toBeNull()

    const sessionLinks = within(sessionSection as HTMLElement).getAllByRole('link')
    expect(sessionLinks).toHaveLength(2)
    expect(sessionLinks[0]).toHaveAttribute(
      'href',
      '/mentor/alex-kim/book?eventType=101&returnTo=%2Ffind%3Fschool%3Dumich%23mentors'
    )
    expect(sessionLinks[1]).toHaveAttribute(
      'href',
      '/mentor/alex-kim/book?eventType=202&returnTo=%2Ffind%3Fschool%3Dumich%23mentors'
    )
    expect(screen.queryByRole('link', { name: /see available times/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/no account is needed/i)).not.toBeInTheDocument()
  })

  it('preserves the safe checkout-cancellation state', async () => {
    render(
      await MentorProfilePage({
        params: Promise.resolve({ username: 'alex-kim' }),
        searchParams: Promise.resolve({ checkout: 'cancelled' }),
      })
    )

    expect(screen.getByText('Checkout cancelled')).toBeInTheDocument()
    expect(screen.getByText(/No session was booked/)).toBeInTheDocument()
  })
})
