import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingDashboard, type OnboardingStep } from './OnboardingDashboard'

vi.mock('./TodaySessions', () => ({
  TodaySessions: () => <section aria-label="Upcoming sessions" />,
}))

const makeStep = (
  id: OnboardingStep['id'],
  actionUrl: string,
  requiredForPaid?: boolean
): OnboardingStep => ({
  id,
  title: id,
  description: id,
  completed: false,
  actionUrl,
  actionLabel: id,
  iconName: id,
  requiredForPaid,
})

describe('mentor onboarding', () => {
  it('orders setup around the public profile before scheduling and payouts', () => {
    const steps = [
      makeStep('stripe', '/settings/event-types', true),
      makeStep('event-types', '/settings/event-types'),
      makeStep('calendar', '/settings/calendar'),
      makeStep('availability', '/settings/availability'),
      makeStep('profile', '/settings/profile'),
    ]

    render(
      <OnboardingDashboard
        initialStatus={{ isComplete: false, completedSteps: 0, totalSteps: 5, steps }}
      />
    )

    const setupLinks = screen.getAllByRole('link').slice(0, 5)
    expect(setupLinks.map(link => link.textContent)).toEqual([
      expect.stringContaining('Edit profile'),
      expect.stringContaining('Connect calendar'),
      expect.stringContaining('Set availability'),
      expect.stringContaining('Review session types'),
      expect.stringContaining('Set up payouts'),
    ])
  })

  it('does not require payout setup for free-only mentoring', () => {
    const steps = [
      makeStep('profile', '/settings/profile'),
      makeStep('calendar', '/settings/calendar'),
      makeStep('availability', '/settings/availability'),
      makeStep('event-types', '/settings/event-types'),
      makeStep('stripe', '/settings/event-types', false),
    ]

    render(
      <OnboardingDashboard
        initialStatus={{ isComplete: false, completedSteps: 0, totalSteps: 4, steps }}
      />
    )

    expect(screen.queryByRole('link', { name: /set up payouts/i })).toBeNull()
  })
})
