import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {
    PAYMENTS_ENABLED: false,
    NEXT_PUBLIC_BASE_URL: 'https://discuno.test',
  },
  getCalcomSchedules: vi.fn(),
  getFullProfile: vi.fn(),
  getMentorCalcomConnection: vi.fn(),
  getMentorEventTypes: vi.fn(),
  getMentorStripeAccount: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('~/env', () => ({ env: mocks.env }))
vi.mock('~/lib/auth/auth-utils', () => ({ requireFreshAuth: vi.fn() }))
vi.mock('~/lib/calcom', () => ({
  getCalcomSchedules: mocks.getCalcomSchedules,
  updateCalcomSchedule: vi.fn(),
}))
vi.mock('~/lib/services/booking-service', () => ({ cancelOwnedMentorBooking: vi.fn() }))
vi.mock('~/lib/services/calcom-service', () => ({ updateMentorEventType: vi.fn() }))
vi.mock('~/lib/services/stripe-service', () => ({ upsertMentorStripeAccount: vi.fn() }))
vi.mock('~/lib/stripe', () => ({
  stripe: {
    accounts: {
      create: vi.fn(),
      createLoginLink: vi.fn(),
      list: vi.fn(),
      retrieve: vi.fn(),
    },
  },
}))
vi.mock('~/server/auth/dal', () => ({ syncMentorEventTypesForUser: vi.fn() }))
vi.mock('~/server/dal/stripe', () => ({ markStripeAccountDeleted: vi.fn() }))
vi.mock('~/server/queries/bookings', () => ({ getMentorBookings: vi.fn() }))
vi.mock('~/server/queries/calcom', () => ({
  getMentorCalcomConnection: mocks.getMentorCalcomConnection,
}))
vi.mock('~/server/queries/event-types', () => ({
  getMentorEventTypes: mocks.getMentorEventTypes,
}))
vi.mock('~/server/queries/profiles', () => ({ getFullProfile: mocks.getFullProfile }))
vi.mock('~/server/queries/stripe', () => ({
  getMentorStripeAccount: mocks.getMentorStripeAccount,
}))

import { getMentorOnboardingStatus } from '~/app/(app)/(mentor)/settings/actions'

const eventType = (customPrice: number) => ({
  id: 1,
  calcomEventTypeId: 42,
  title: 'College decision conversation',
  description: null,
  duration: 30,
  isEnabled: true,
  customPrice,
  currency: 'USD',
  bookingCompatible: true,
  bookingCompatibilityReasons: [],
})

describe('mentor onboarding payment launch gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.PAYMENTS_ENABLED = false
    mocks.getFullProfile.mockResolvedValue({
      bio: 'I can help students compare two academic paths.',
      image: 'https://discuno.test/avatar.png',
      name: 'Mentor Student',
      username: 'mentor-student',
      major: 'Economics',
    })
    mocks.getMentorCalcomConnection.mockResolvedValue({ userId: 'mentor-user-id' })
    mocks.getCalcomSchedules.mockResolvedValue([
      {
        id: 7,
        isDefault: true,
        availability: [
          {
            days: ['Monday'],
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
        overrides: [],
      },
    ])
    mocks.getMentorStripeAccount.mockResolvedValue(null)
  })

  it('does not call onboarding complete when the only enabled type is paid and hidden', async () => {
    mocks.getMentorEventTypes.mockResolvedValue([eventType(2500)])

    const status = await getMentorOnboardingStatus()

    expect(status.isComplete).toBe(false)
    expect(status.steps.find(step => step.id === 'event-types')?.completed).toBe(false)
    expect(status.steps.find(step => step.id === 'stripe')?.requiredForPaid).toBe(false)
  })

  it('treats an enabled free type as bookable while paid bookings are paused', async () => {
    mocks.getMentorEventTypes.mockResolvedValue([eventType(0)])

    const status = await getMentorOnboardingStatus()

    expect(status.isComplete).toBe(true)
    expect(status.steps.find(step => step.id === 'event-types')?.completed).toBe(true)
  })
})
