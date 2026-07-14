'use server'
import 'server-only'

import { revalidatePath } from 'next/cache'
import type { Availability, DateOverride, WeeklySchedule } from '~/app/types/availability'
import { availabilitySchema, dateOverrideSchema } from '~/app/types/availability'
import { env } from '~/env'
import { getCalcomSchedules, updateCalcomSchedule } from '~/lib/calcom'
import type { DayOfWeek } from '~/lib/calcom/schemas'
import { MAXIMUM_PAID_BOOKING_PRICE, MINIMUM_PAID_BOOKING_PRICE } from '~/lib/constants'
import { type UpdateMentorEventType } from '~/lib/schemas/db'
import { cancelOwnedMentorBooking } from '~/lib/services/booking-service'
import { updateMentorEventType } from '~/lib/services/calcom-service'
import { upsertMentorStripeAccount } from '~/lib/services/stripe-service'
import { stripe } from '~/lib/stripe'
import { getMentorBookings } from '~/server/queries/bookings'
import { getMentorCalcomConnection } from '~/server/queries/calcom'
import { getMentorEventTypes } from '~/server/queries/event-types'
import { getFullProfile } from '~/server/queries/profiles'
import { getMentorStripeAccount } from '~/server/queries/stripe'

/**
 * Fetches the user's availability schedule from Cal.com.
 * @see https://cal.com/docs/enterprise/api-reference/v2/openapi#/paths/~1schedules/get
 */
export async function getSchedule(): Promise<{
  success: boolean
  data?: Availability
  error?: string
}> {
  try {
    const connection = await getMentorCalcomConnection()
    const schedules = await getCalcomSchedules(connection.calcomUserId)
    const schedule = schedules.find(candidate => candidate.isDefault) ?? schedules[0]

    if (!schedule) {
      return { success: true, data: undefined }
    }

    const weeklySchedule: WeeklySchedule = {
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    }

    for (const availability of schedule.availability) {
      for (const day of availability.days) {
        const dayKey = day.toLowerCase() as keyof WeeklySchedule
        weeklySchedule[dayKey].push({
          start: availability.startTime,
          end: availability.endTime,
        })
      }
    }

    const dateOverrides: DateOverride[] = []
    for (const override of schedule.overrides) {
      const existing = dateOverrides.find(candidate => candidate.date === override.date)
      const interval = { start: override.startTime, end: override.endTime }
      if (existing) {
        existing.intervals.push(interval)
      } else {
        dateOverrides.push({ date: override.date, intervals: [interval] })
      }
    }

    return {
      success: true,
      data: {
        id: schedule.id.toString(),
        weeklySchedule,
        dateOverrides,
      },
    }
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while fetching the schedule',
    }
  }
}

/**
 * Updates an existing availability schedule in Cal.com.
 * @see https://cal.com/docs/enterprise/api-reference/v2/openapi#/paths/~1schedules~1{schedule_id}/patch
 */
export async function updateSchedule(schedule: Availability): Promise<{
  success: boolean
  data?: Availability
  error?: string
}> {
  try {
    const validationResult = availabilitySchema.safeParse(schedule)
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid schedule data: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
      }
    }

    const connection = await getMentorCalcomConnection()
    await updateCalcomSchedule(connection.calcomUserId, Number(schedule.id), {
      availability: Object.entries(schedule.weeklySchedule).flatMap(([day, intervals]) =>
        intervals.map(interval => ({
          days: [(day.charAt(0).toUpperCase() + day.slice(1)) as DayOfWeek],
          startTime: interval.start,
          endTime: interval.end,
        }))
      ),
      overrides: schedule.dateOverrides.flatMap(override =>
        override.intervals.map(interval => ({
          date: override.date,
          startTime: interval.start,
          endTime: interval.end,
        }))
      ),
    })

    revalidatePath('/scheduling')
    return { success: true, data: schedule }
  } catch (error) {
    console.error('Error updating schedule:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while updating the schedule',
    }
  }
}

/**
 * Adds a new date-specific override to the user's schedule.
 */
export async function createDateOverride(override: DateOverride): Promise<{
  success: boolean
  data?: DateOverride[]
  error?: string
}> {
  try {
    // Validate input using safeParse
    const validationResult = dateOverrideSchema.safeParse(override)
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid override data: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
      }
    }

    const scheduleResult = await getSchedule()
    if (!scheduleResult.success || !scheduleResult.data) {
      return {
        success: false,
        error: scheduleResult.error ?? 'Could not find schedule to update',
      }
    }

    const newOverrides = [...scheduleResult.data.dateOverrides, override]
    const newSchedule: Availability = {
      ...scheduleResult.data,
      dateOverrides: newOverrides,
    }

    const updateResult = await updateSchedule(newSchedule)
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error ?? 'Failed to update schedule',
      }
    }

    return {
      success: true,
      data: newOverrides,
    }
  } catch (error) {
    console.error('Error creating date override:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while creating the override',
    }
  }
}

/**
 * Updates an existing date-specific override in the user's schedule.
 */
export async function updateDateOverride(override: DateOverride): Promise<{
  success: boolean
  data?: DateOverride[]
  error?: string
}> {
  try {
    // Validate input using safeParse
    const validationResult = dateOverrideSchema.safeParse(override)
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid override data: ${validationResult.error.issues.map(i => i.message).join(', ')}`,
      }
    }

    const scheduleResult = await getSchedule()
    if (!scheduleResult.success || !scheduleResult.data) {
      return {
        success: false,
        error: scheduleResult.error ?? 'Could not find schedule to update',
      }
    }

    const newOverrides = scheduleResult.data.dateOverrides.map(o =>
      o.date === override.date ? override : o
    )
    const newSchedule: Availability = {
      ...scheduleResult.data,
      dateOverrides: newOverrides,
    }

    const updateResult = await updateSchedule(newSchedule)
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error ?? 'Failed to update schedule',
      }
    }

    return {
      success: true,
      data: newOverrides,
    }
  } catch (error) {
    console.error('Error updating date override:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while updating the override',
    }
  }
}

/**
 * Deletes a date-specific override from the user's schedule.
 */
export async function deleteDateOverride(date: string): Promise<{
  success: boolean
  data?: DateOverride[]
  error?: string
}> {
  try {
    if (!date || typeof date !== 'string') {
      return {
        success: false,
        error: 'Invalid date provided',
      }
    }

    const scheduleResult = await getSchedule()
    if (!scheduleResult.success || !scheduleResult.data) {
      return {
        success: false,
        error: scheduleResult.error ?? 'Could not find schedule to update',
      }
    }

    const newOverrides = scheduleResult.data.dateOverrides.filter(o => o.date !== date)
    const newSchedule: Availability = {
      ...scheduleResult.data,
      dateOverrides: newOverrides,
    }

    const updateResult = await updateSchedule(newSchedule)
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error ?? 'Failed to update schedule',
      }
    }

    return {
      success: true,
      data: newOverrides,
    }
  } catch (error) {
    console.error('Error deleting date override:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while deleting the override',
    }
  }
}

/**
 * Get mentor's event type preferences with team event types
 */
export const getMentorEventTypePreferences = async (): Promise<{
  success: boolean
  data?: Array<{
    id: number
    calcomEventTypeId: number
    title: string
    length: number
    description?: string
    isEnabled: boolean
    customPrice: number | null
    currency: string
  }>
  error?: string
}> => {
  try {
    // Fetch mentor's preferences directly from database (includes event type details via joins)
    const mentorPreferences = await getMentorEventTypes()

    // Transform the data to match the expected format
    const combined = mentorPreferences.map(pref => ({
      id: pref.id,
      calcomEventTypeId: pref.calcomEventTypeId,
      title: pref.title,
      length: pref.duration,
      description: pref.description ?? undefined,
      isEnabled: pref.isEnabled,
      customPrice: pref.customPrice,
      currency: pref.currency,
    }))

    return {
      success: true,
      data: combined.map(c => ({ ...c, id: c.calcomEventTypeId })),
    }
  } catch (error) {
    console.error('Error getting mentor event type preferences:', error)
    return {
      success: false,
      error: 'Failed to get event type preferences',
    }
  }
}

/**
 * Update mentor's event type preferences
 */
export const updateMentorEventTypePreferences = async (
  eventTypeId: number,
  data: UpdateMentorEventType
): Promise<{
  success: boolean
  error?: string
}> => {
  try {
    if (data.customPrice && data.customPrice < 0) {
      return {
        success: false,
        error: 'Price cannot be negative.',
      }
    }
    if (data.customPrice && data.customPrice > 0 && data.customPrice < MINIMUM_PAID_BOOKING_PRICE) {
      return {
        success: false,
        error: 'The minimum price for a paid booking is $5.00.',
      }
    }
    if (data.customPrice && data.customPrice > MAXIMUM_PAID_BOOKING_PRICE) {
      return {
        success: false,
        error: 'The maximum session price is $10,000.00.',
      }
    }
    await updateMentorEventType(eventTypeId, {
      ...data,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error updating mentor event type preferences:', error)
    return {
      success: false,
      error: 'Failed to update event type preferences',
    }
  }
}

/**
 * Create Stripe Connect account for mentor or resume onboarding
 */
export const createStripeConnectAccount = async (): Promise<{
  success: boolean
  error?: string
}> => {
  // Permission check removed - protected by query layer (getFullProfile)
  try {
    const profile = await getFullProfile()
    if (!profile) {
      return {
        success: false,
        error: 'Profile not found',
      }
    }
    const userId = profile.userId

    if (!profile.email) {
      return {
        success: false,
        error: 'Email is required for Stripe account creation',
      }
    }

    // Check if user already has a Stripe account
    const existingAccount = await getMentorStripeAccount()

    if (existingAccount) {
      // If account exists but is not active, let the caller request a fresh
      // server-authorized onboarding link for the stored account.
      if (existingAccount.stripeAccountStatus !== 'active') {
        return {
          success: true,
        }
      } else {
        return {
          success: false,
          error: 'Stripe account is already active',
        }
      }
    }

    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
      controller: {
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        requirement_collection: 'stripe',
        stripe_dashboard: { type: 'express' },
      },
      email: profile.email,
      country: 'US',
      business_type: 'individual',
      metadata: {
        userId,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: '8299',
        url: 'https://discuno.com',
        product_description: 'Provides college advice and guidance via the Discuno platform',
        name: profile.name ?? 'Discuno Mentor',
      },
    })

    await upsertMentorStripeAccount({
      userId,
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
      payoutsEnabled: false,
      chargesEnabled: false,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return {
      success: false,
      error: 'Failed to create Stripe account',
    }
  }
}

/**
 * Get mentor's Stripe account status
 */
export const getMentorStripeStatus = async (): Promise<{
  success: boolean
  data?: {
    hasAccount: boolean
    onboardingCompleted: boolean
    payoutsEnabled: boolean
    chargesEnabled: boolean
    stripeAccountStatus: 'pending' | 'active' | 'restricted' | 'inactive' | null
  }
  error?: string
}> => {
  try {
    const stripeAccount = await getMentorStripeAccount()

    if (!stripeAccount) {
      return {
        success: true,
        data: {
          hasAccount: false,
          onboardingCompleted: false,
          payoutsEnabled: false,
          chargesEnabled: false,
          stripeAccountStatus: null,
        },
      }
    }

    return {
      success: true,
      data: {
        hasAccount: true,
        onboardingCompleted:
          stripeAccount.stripeAccountStatus === 'active' &&
          stripeAccount.chargesEnabled &&
          stripeAccount.payoutsEnabled,
        payoutsEnabled: stripeAccount.payoutsEnabled,
        chargesEnabled: stripeAccount.chargesEnabled,
        stripeAccountStatus: stripeAccount.stripeAccountStatus,
      },
    }
  } catch (error) {
    console.error('Error getting mentor Stripe status:', error)
    return {
      success: false,
      error: 'Failed to get Stripe status',
    }
  }
}

/**
 * Create Stripe Account Link for hosted onboarding
 * Redirects to Stripe-hosted onboarding flow
 */
export const createStripeAccountLink = async ({
  type = 'account_onboarding',
  collectionOptions = 'eventually_due',
}: {
  type?: 'account_onboarding' | 'account_update'
  collectionOptions?: 'currently_due' | 'eventually_due'
} = {}): Promise<{
  success: boolean
  url?: string
  error?: string
}> => {
  try {
    // SECURITY: Resolve the account through the protected query. Never trust
    // an account ID supplied by a client invoking this Server Action.
    const stripeAccount = await getMentorStripeAccount()
    if (!stripeAccount) {
      return {
        success: false,
        error: 'Stripe account not found',
      }
    }

    const baseUrl = env.BETTER_AUTH_URL ?? 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.stripeAccountId,
      refresh_url: `${baseUrl}/settings/event-types?stripe_refresh=true`,
      return_url: `${baseUrl}/settings/event-types?stripe_setup=success`,
      type,
      collection_options: {
        fields: collectionOptions,
      },
    })

    return {
      success: true,
      url: accountLink.url,
    }
  } catch (error) {
    console.error('Error creating Stripe Account Link:', error)
    return {
      success: false,
      error: 'Failed to create Account Link',
    }
  }
}

/**
 * Create Stripe Login Link for Express Dashboard
 * Redirects to Stripe-hosted Express Dashboard
 */
export const createStripeLoginLink = async (): Promise<{
  success: boolean
  url?: string
  error?: string
}> => {
  try {
    // SECURITY: Resolve the account through the protected query. Positional
    // arguments sent by a forged client request are intentionally ignored.
    const stripeAccount = await getMentorStripeAccount()
    if (!stripeAccount) {
      return {
        success: false,
        error: 'Stripe account not found',
      }
    }

    const loginLink = await stripe.accounts.createLoginLink(stripeAccount.stripeAccountId)

    return {
      success: true,
      url: loginLink.url,
    }
  } catch (error) {
    console.error('Error creating Stripe Login Link:', error)
    return {
      success: false,
      error: 'Failed to create Login Link',
    }
  }
}
/**
 * Fetches all bookings for the current user from Cal.com.
 * @see https://cal.com/docs/enterprise/api-reference/v2/openapi#/paths/~1bookings/get
 */

export const getBookings = async (): Promise<{
  success: boolean
  data?: Awaited<ReturnType<typeof getMentorBookings>>
  error?: string
}> => {
  // Permission check removed - protected by query layer (getFullProfile)
  try {
    const profile = await getFullProfile()
    if (!profile) {
      return {
        success: false,
        error: 'Profile not found',
      }
    }
    const userId = profile.userId
    const bookings = await getMentorBookings(userId)

    return {
      success: true,
      data: bookings,
    }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while fetching bookings',
    }
  }
}

export const cancelBooking = async ({
  bookingUid,
  cancellationReason,
}: {
  bookingUid: string
  cancellationReason: string
}): Promise<{
  success: boolean
  error?: string
}> => {
  try {
    await cancelOwnedMentorBooking(bookingUid, cancellationReason)

    revalidatePath('/settings/bookings')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while cancelling the booking',
    }
  }
}

export const getFullProfileAction = async () => {
  return await getFullProfile()
}

/**
 * Get mentor's onboarding status - which steps have been completed
 */
export const getMentorOnboardingStatus = async (): Promise<{
  isComplete: boolean
  completedSteps: number
  totalSteps: number
  steps: Array<{
    id: string
    title: string
    description: string
    completed: boolean
    actionUrl: string
    actionLabel: string
    iconName: string
    missingFields?: string[]
    requiredForPaid?: boolean
  }>
}> => {
  // Check profile completion
  const profile = await getFullProfile()
  const missingProfileFields: string[] = []

  if (!profile?.bio) missingProfileFields.push('Bio')
  if (!profile?.image) missingProfileFields.push('Profile photo')
  if (!profile?.name) missingProfileFields.push('Name')
  if (!profile?.major) missingProfileFields.push('Major')

  const hasProfile = missingProfileFields.length === 0

  // Check Cal.com setup (availability)
  const scheduleResult = await getSchedule()
  const hasAvailability =
    scheduleResult.success &&
    !!scheduleResult.data &&
    Object.values(scheduleResult.data.weeklySchedule).some(day => day.length > 0)

  // Check if any event types are enabled
  const eventTypesResult = await getMentorEventTypePreferences()
  const hasEnabledEventTypes =
    eventTypesResult.success &&
    !!eventTypesResult.data &&
    eventTypesResult.data.some(et => et.isEnabled)

  // Check if pricing is set for enabled event types
  const hasPricing =
    eventTypesResult.success &&
    !!eventTypesResult.data &&
    eventTypesResult.data.some(et => et.isEnabled && et.customPrice !== null)

  // Check if mentor has any paid event types enabled
  const hasPaidEventTypes =
    eventTypesResult.success &&
    !!eventTypesResult.data &&
    eventTypesResult.data.some(et => et.isEnabled && et.customPrice !== null && et.customPrice > 0)

  // Check Stripe setup
  const stripeStatus = await getMentorStripeStatus()
  const hasStripe =
    stripeStatus.success &&
    stripeStatus.data?.stripeAccountStatus === 'active' &&
    !!stripeStatus.data.chargesEnabled &&
    !!stripeStatus.data.payoutsEnabled

  // Every enabled paid event type must have a fully active destination account.
  const stripeRequired = hasPaidEventTypes

  const steps = [
    {
      id: 'profile',
      title: 'Complete your profile',
      description:
        missingProfileFields.length > 0
          ? `Missing: ${missingProfileFields.join(', ')}`
          : 'Add a bio and profile photo to help students get to know you',
      completed: hasProfile,
      actionUrl: '/settings/profile/edit',
      actionLabel: 'Complete Profile',
      iconName: 'User',
      missingFields: missingProfileFields,
    },
    {
      id: 'availability',
      title: 'Set your availability',
      description: hasAvailability
        ? "You've configured your availability"
        : "Configure when you're available for mentorship sessions",
      completed: hasAvailability,
      actionUrl: '/settings/availability',
      actionLabel: 'Set Availability',
      iconName: 'CalendarDays',
    },
    {
      id: 'event-types',
      title: 'Enable event types',
      description: hasEnabledEventTypes
        ? 'You have enabled event types'
        : 'Choose which session types students can book with you',
      completed: hasEnabledEventTypes,
      actionUrl: '/settings/event-types',
      actionLabel: 'Enable Event Types',
      iconName: 'BookOpen',
    },
    {
      id: 'stripe',
      title: 'Connect Stripe account',
      description: hasStripe
        ? 'Stripe account connected'
        : 'Required only if you want to charge for sessions. Skip if offering only free sessions.',
      completed: hasStripe,
      actionUrl: '/settings/event-types',
      actionLabel: 'Connect Stripe',
      iconName: 'CreditCard',
      requiredForPaid: stripeRequired,
    },
    {
      id: 'pricing',
      title: 'Set pricing',
      description: hasPricing
        ? 'Pricing configured for your sessions'
        : 'Configure pricing for your sessions (free or paid)',
      completed: hasPricing,
      actionUrl: '/settings/event-types',
      actionLabel: 'Set Pricing',
      iconName: 'DollarSign',
      requiredForPaid: false,
    },
  ]

  // Calculate completion based on required steps
  // Count steps without requiredForPaid flag (always required: profile, availability, event-types)
  // Plus steps with requiredForPaid === true (Stripe when only paid sessions)
  const requiredSteps = steps.filter(
    s => s.requiredForPaid === undefined || s.requiredForPaid === true
  )
  const completedRequiredSteps = requiredSteps.filter(s => s.completed)

  const completedCount = completedRequiredSteps.length
  const totalSteps = requiredSteps.length
  const isComplete = completedCount === totalSteps

  return {
    isComplete,
    completedSteps: completedCount,
    totalSteps,
    steps,
  }
}
