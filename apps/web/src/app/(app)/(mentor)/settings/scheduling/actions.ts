'use server'

import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'
import type { CalcomToken, CreateCalcomUserInput, UpdateCalcomUserInput } from '~/app/types'
import type { Availability, DateOverride, WeeklySchedule } from '~/app/types/availability'
import { availabilitySchema, dateOverrideSchema } from '~/app/types/availability'
import { env } from '~/env'
import { BadRequestError, ExternalApiError, requireAuth } from '~/lib/auth/auth-utils'

import {
  createCalcomUser as createCalcomUserCore,
  updateCalcomUser as updateCalcomUserCore,
} from '~/lib/calcom'
import {
  getFullProfile,
  getMentorEventTypes,
  getMentorStripeAccount,
  getUserCalcomTokens,
  updateCalcomTokensByUserId,
  upsertMentorEventType,
  upsertMentorStripeAccount,
} from '~/server/queries'

/**
 * Get user's current Cal.com access token
 */
const getCalcomAccessToken = async (): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  username?: string
  error?: string
}> => {
  try {
    console.log('getCalcomAccessToken')
    const tokens = await getUserCalcomTokens()
    console.log('tokens', tokens)

    if (!tokens) {
      return {
        success: false,
        error: 'No Cal.com tokens found',
      }
    }

    console.log('tokens.accessToken', tokens.accessToken)

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      username: tokens.calcomUsername,
    }
  } catch (error) {
    console.error('Get Cal.com token error:', error)
    return {
      success: false,
      error: 'Failed to get token',
    }
  }
}

/**
 * Refresh Cal.com access token
 */
const refreshCalcomToken = async (): Promise<{
  success: boolean
  accessToken: string
  error?: string
}> => {
  try {
    const tokenRecord = await getUserCalcomTokens()
    if (!tokenRecord) {
      return {
        success: false,
        accessToken: '',
        error: 'Token not found',
      }
    }

    // Check if refresh token is expired
    const now = new Date()
    if (tokenRecord.accessTokenExpiresAt < now) {
      // Try force refresh if refresh token is expired
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
    }

    // Refresh the tokens using Cal.com API v2 - correct endpoint from docs
    const refreshResponse = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth/${env.NEXT_PUBLIC_X_CAL_ID}/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cal-secret-key': env.X_CAL_SECRET_KEY,
        },
        body: JSON.stringify({
          refreshToken: tokenRecord.refreshToken,
        }),
      }
    )

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      console.error('Normal refresh failed:', refreshResponse.status, errorText)

      // Try force refresh on any failure
      console.log('Normal refresh failed, trying force refresh...')
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
    }

    const refreshData = await refreshResponse.json()

    if (refreshData.status !== 'success') {
      console.error('Refresh response error:', refreshData)
      // Try force refresh on any failure
      return await forceRefreshCalcomToken(tokenRecord.calcomUserId, tokenRecord.userId)
    }

    // Use the expiration times from the API response
    const newAccessTokenExpiresAt = new Date(
      refreshData.data.accessTokenExpiresAt ?? Date.now() + 60 * 60 * 1000
    )
    const newRefreshTokenExpiresAt = new Date(
      refreshData.data.refreshTokenExpiresAt ?? Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const token: CalcomToken = {
      accessToken: refreshData.data.accessToken,
      refreshToken: refreshData.data.refreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }

    await updateCalcomTokensByUserId({
      userId: tokenRecord.userId,
      calcomUserId: tokenRecord.calcomUserId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt.getTime(),
      refreshTokenExpiresAt: token.refreshTokenExpiresAt.getTime(),
    })

    console.log('Token refresh successful')

    return {
      success: true,
      accessToken: refreshData.data.accessToken,
    }
  } catch (error) {
    console.error('Cal.com refresh token error:', error)
    return {
      success: false,
      accessToken: '',
      error: 'Token refresh failed',
    }
  }
}

/**
 * Force refresh Cal.com tokens when refresh token is expired
 */
const forceRefreshCalcomToken = async (
  calcomUserId: number,
  userId: string
): Promise<{
  success: boolean
  accessToken: string
  error?: string
}> => {
  try {
    console.log('Attempting force refresh for user:', userId, 'calcom user:', calcomUserId)

    // Correct endpoint from Cal.com API v2 docs
    const forceRefreshResponse = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/oauth-clients/${env.NEXT_PUBLIC_X_CAL_ID}/users/${calcomUserId}/force-refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cal-secret-key': env.X_CAL_SECRET_KEY,
        },
        body: JSON.stringify({}),
      }
    )

    if (!forceRefreshResponse.ok) {
      const errorText = await forceRefreshResponse.text()
      console.error('Force refresh failed:', forceRefreshResponse.status, errorText)
      throw new Error(`Force refresh failed: ${forceRefreshResponse.status} - ${errorText}`)
    }

    const forceRefreshData = await forceRefreshResponse.json()

    if (forceRefreshData.status !== 'success') {
      console.error('Force refresh response error:', forceRefreshData)
      throw new Error(`Force refresh API error: ${JSON.stringify(forceRefreshData)}`)
    }

    // Use the expiration times from the API response
    const newAccessTokenExpiresAt = new Date(
      forceRefreshData.data.accessTokenExpiresAt ?? Date.now() + 60 * 60 * 1000
    )
    const newRefreshTokenExpiresAt = new Date(
      forceRefreshData.data.refreshTokenExpiresAt ?? Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const token: CalcomToken = {
      accessToken: forceRefreshData.data.accessToken,
      refreshToken: forceRefreshData.data.refreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }

    await updateCalcomTokensByUserId({
      userId,
      calcomUserId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt.getTime(),
      refreshTokenExpiresAt: token.refreshTokenExpiresAt.getTime(),
    })

    console.log('Force refresh successful for user:', userId)

    return {
      success: true,
      accessToken: forceRefreshData.data.accessToken,
    }
  } catch (error) {
    console.error('Cal.com force refresh error:', error)
    return {
      success: false,
      accessToken: '',
      error: 'Token refresh failed',
    }
  }
}

/**
 * Check if user has Cal.com integration set up
 */
const hasCalcomIntegration = async () => {
  try {
    const tokens = await getUserCalcomTokens()
    return !!tokens
  } catch (error) {
    console.error('Check Cal.com integration error:', error)
    return false
  }
}

/**
 * Get user's Cal.com token
 */
const getUserCalcomToken = async (): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}> => {
  try {
    return await getCalcomAccessToken()
  } catch (error) {
    console.error('Get user Cal.com token error:', error)
    return {
      success: false,
      error: 'Failed to get token',
    }
  }
}

/**
 * Create Cal.com user (server action wrapper)
 */
const createCalcomUser = async (
  data: CreateCalcomUserInput
): Promise<{
  calcomUserId?: number
  username?: string
}> => {
  try {
    const result = await createCalcomUserCore(data)
    return {
      calcomUserId: result.calcomUserId,
      username: result.username,
    }
  } catch (error) {
    console.error('Cal.com user creation error:', error)
    if (error instanceof ExternalApiError) {
      throw error
    }
    throw new BadRequestError('Failed to create Cal.com user')
  }
}

/**
 * Update Cal.com user (server action wrapper)
 */
const updateCalcomUser = async (data: UpdateCalcomUserInput): Promise<void> => {
  try {
    await updateCalcomUserCore(data)
  } catch (error) {
    console.error('Cal.com user update error:', error)
    if (error instanceof ExternalApiError) {
      throw error
    }
    throw new BadRequestError('Failed to update Cal.com user')
  }
}

/**
 * Fetches the user's availability schedule from Cal.com.
 * @see https://cal.com/docs/enterprise/api-reference/v2/openapi#/paths/~1schedules/get
 */
export async function getSchedule(): Promise<Availability | null> {
  try {
    const tokenResult = await getValidCalcomToken()

    if (!tokenResult.success || !tokenResult.accessToken) {
      throw new ExternalApiError('Failed to get valid Cal.com token.')
    }

    const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/schedules/default`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new ExternalApiError(`Failed to fetch schedule: ${errorBody}`)
    }

    const data = await response.json()

    if (!data.data) {
      return null
    }

    // The /schedules/default endpoint returns a single schedule object
    const calcomSchedule = data.data

    // Map Cal.com v2 availability (array of per-day interval arrays) into our WeeklySchedule format
    const weeklySchedule: WeeklySchedule = {
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    }
    const dayNames: (keyof WeeklySchedule)[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
    dayNames.forEach((dayKey, idx) => {
      const dayIntervals = calcomSchedule.availability?.[idx]
      if (Array.isArray(dayIntervals)) {
        for (const interval of dayIntervals) {
          const list = weeklySchedule[dayKey]
          // Convert ISO datetime to HH:mm for time inputs
          const startRaw: string = interval.start
          const endRaw: string = interval.end
          const start = startRaw.length >= 16 ? startRaw.substring(11, 16) : startRaw
          const end = endRaw.length >= 16 ? endRaw.substring(11, 16) : endRaw
          list.push({ start, end })
        }
      }
    })

    // Map Cal.com v2 overrides into our DateOverride[]
    const dateOverrides: DateOverride[] = []
    for (const ov of calcomSchedule.dateOverrides ?? []) {
      // Each override can include multiple ranges per date
      for (const range of ov.ranges ?? []) {
        // Derive date: use ov.date or fallback to range start date (YYYY-MM-DD)
        const date = ov.date ?? (range.start.split('T')[0] as string)
        const startRaw: string = range.start
        const endRaw: string = range.end
        const start = startRaw.length >= 16 ? startRaw.substring(11, 16) : startRaw
        const end = endRaw.length >= 16 ? endRaw.substring(11, 16) : endRaw
        const interval = { start, end }
        // Group by date
        const existing = dateOverrides.find(d => d.date === date)
        if (existing) {
          existing.intervals.push(interval)
        } else {
          dateOverrides.push({ date, intervals: [interval] })
        }
      }
    }

    return {
      id: calcomSchedule.id.toString(),
      weeklySchedule,
      dateOverrides,
    }
  } catch (error) {
    console.error('Error fetching schedule:', error)
    if (error instanceof ExternalApiError) throw error
    throw new Error('An unexpected error occurred while fetching the schedule.')
  }
}

/**
 * Updates an existing availability schedule in Cal.com.
 * @see https://cal.com/docs/enterprise/api-reference/v2/openapi#/paths/~1schedules~1{schedule_id}/patch
 */
export async function updateSchedule(schedule: Availability): Promise<Availability> {
  console.log('updateSchedule called with:', schedule)
  try {
    // Validate input using canonical schema
    availabilitySchema.parse(schedule)

    const tokenResult = await getValidCalcomToken()

    if (!tokenResult.success || !tokenResult.accessToken) {
      throw new ExternalApiError('Failed to get valid Cal.com token.')
    }

    const payload = {
      // Cal.com v2 expects an array of slots with days array
      availability: Object.entries(schedule.weeklySchedule).flatMap(([day, intervals]) =>
        intervals.map(interval => ({
          days: [day.charAt(0).toUpperCase() + day.slice(1)],
          startTime: interval.start,
          endTime: interval.end,
        }))
      ),
      overrides: schedule.dateOverrides.flatMap(o =>
        o.intervals.map(i => ({
          date: o.date,
          startTime: i.start,
          endTime: i.end,
        }))
      ),
    }

    const response = await fetch(`${env.NEXT_PUBLIC_CALCOM_API_URL}/schedules/${schedule.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
        'cal-api-version': '2024-06-14',
      },
      body: JSON.stringify(payload),
    })

    console.log('updateSchedule response status:', response.status)
    console.log('response json:', await response.json())

    if (!response.ok) {
      const errorBody = await response.text()
      throw new ExternalApiError(`Failed to update schedule: ${errorBody}`)
    }

    revalidatePath('/scheduling')

    return schedule
  } catch (error) {
    console.error('Error updating schedule:', error)
    if (error instanceof ExternalApiError) throw error
    throw new Error('An unexpected error occurred while updating the schedule.')
  }
}

/**
 * Adds a new date-specific override to the user's schedule.
 */
export async function createDateOverride(override: DateOverride): Promise<DateOverride[]> {
  dateOverrideSchema.parse(override)
  const schedule = await getSchedule()
  if (!schedule) {
    throw new Error('Could not find schedule to update.')
  }

  const newOverrides = [...schedule.dateOverrides, override]
  const newSchedule: Availability = {
    ...schedule,
    dateOverrides: newOverrides,
  }

  await updateSchedule(newSchedule)
  return newOverrides
}

/**
 * Updates an existing date-specific override in the user's schedule.
 */
export async function updateDateOverride(override: DateOverride): Promise<DateOverride[]> {
  dateOverrideSchema.parse(override)
  const schedule = await getSchedule()
  if (!schedule) {
    throw new Error('Could not find schedule to update.')
  }

  const newOverrides = schedule.dateOverrides.map(o => (o.date === override.date ? override : o))
  const newSchedule: Availability = {
    ...schedule,
    dateOverrides: newOverrides,
  }

  await updateSchedule(newSchedule)
  return newOverrides
}

/**
 * Deletes a date-specific override from the user's schedule.
 */
export async function deleteDateOverride(date: string): Promise<DateOverride[]> {
  const schedule = await getSchedule()
  if (!schedule) {
    throw new Error('Could not find schedule to update.')
  }

  const newOverrides = schedule.dateOverrides.filter(o => o.date !== date)
  const newSchedule: Availability = {
    ...schedule,
    dateOverrides: newOverrides,
  }

  await updateSchedule(newSchedule)
  return newOverrides
}

export const fetchEventTypes = async () => {
  const tokenResult = await getCalcomAccessToken()
  if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.username) {
    throw new Error('No valid Cal.com access token available')
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types?username=${encodeURIComponent(tokenResult.username)}`,
    {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'cal-api-version': '2024-06-14',
      },
    }
  )

  if (!response.ok) {
    throw new ExternalApiError('Failed to fetch event types')
  }

  const payload = await response.json()
  return Array.isArray(payload.data) ? payload.data : []
}

/**
 * Fetch team event types from Cal.com
 */
export const fetchTeamEventTypes = async (): Promise<
  Array<{
    id: number
    title: string
    slug: string
    length: number
    description?: string
    price?: number
    currency?: string
  }>
> => {
  try {
    const teamId = env.COLLEGE_MENTOR_TEAM_ID
    const orgId = env.CALCOM_ORG_ID

    if (!teamId || !orgId) {
      throw new Error('Missing team or organization ID')
    }

    const response = await fetch(
      `${env.NEXT_PUBLIC_CALCOM_API_URL}/organizations/${orgId}/teams/${teamId}/event-types`,
      {
        headers: {
          Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
          'cal-api-version': '2024-06-14',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch team event types:', response.status, errorText)
      throw new ExternalApiError('Failed to fetch team event types')
    }

    const data = await response.json()
    console.log('Team event types response:', data)

    if (data.status === 'success' && data.data && Array.isArray(data.data)) {
      return data.data.map((eventType: any) => ({
        id: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
        length: eventType.lengthInMinutes ?? eventType.length,
        description: eventType.description,
        price: eventType.price ?? null,
        currency: eventType.currency ?? 'USD',
      }))
    }

    console.warn('Unexpected team event types response structure:', data)
    return []
  } catch (error) {
    console.error('Error fetching team event types:', error)
    throw error
  }
}

/**
 * Get mentor's event type preferences with team event types
 */
export const getMentorEventTypePreferences = async (): Promise<{
  success: boolean
  data?: Array<{
    id: number
    title: string
    slug: string
    length: number
    description?: string
    isEnabled: boolean
    customPrice: number | null
    currency: string
  }>
  error?: string
}> => {
  try {
    // Fetch team event types from Cal.com
    const teamEventTypes = await fetchTeamEventTypes()

    // Fetch mentor's preferences
    const mentorPreferences = await getMentorEventTypes()

    // Create a map of mentor preferences by event type ID
    const preferencesMap = new Map(mentorPreferences.map(pref => [pref.calcomEventTypeId, pref]))

    // Combine team event types with mentor preferences
    const combined = teamEventTypes.map(eventType => {
      const preference = preferencesMap.get(eventType.id)
      return {
        id: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
        length: eventType.length,
        description: eventType.description,
        isEnabled: preference?.isEnabled ?? false,
        customPrice: preference?.customPrice ?? null,
        currency: preference?.currency ?? 'USD',
      }
    })

    return {
      success: true,
      data: combined,
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
export const updateMentorEventTypePreferences = async (data: {
  calcomEventTypeId: number
  calcomEventTypeSlug: string
  isEnabled: boolean
  customPrice?: number
  currency?: string
}): Promise<{
  success: boolean
  error?: string
}> => {
  try {
    const { id: userId } = await requireAuth()

    await upsertMentorEventType({
      userId,
      calcomEventTypeId: data.calcomEventTypeId,
      calcomEventTypeSlug: data.calcomEventTypeSlug,
      isEnabled: data.isEnabled,
      customPrice: data.customPrice,
      currency: data.currency ?? 'USD',
      requiresPayment: !!data.customPrice && data.customPrice > 0, // Auto-set based on price
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
  accountId?: string
  onboardingUrl?: string
  error?: string
}> => {
  try {
    const { id: userId } = await requireAuth()
    const profile = await getFullProfile()

    if (!profile?.email) {
      return {
        success: false,
        error: 'Email is required for Stripe account creation',
      }
    }

    // Check if user already has a Stripe account
    const existingAccount = await getMentorStripeAccount()

    const stripe = new Stripe(env.STRIPE_SECRET_KEY)

    if (existingAccount) {
      // If account exists but is not active, create a new onboarding link
      if (existingAccount.stripeAccountStatus !== 'active') {
        try {
          const accountLink = await stripe.accountLinks.create({
            account: existingAccount.stripeAccountId,
            refresh_url: `${env.NEXT_PUBLIC_BASE_URL}/scheduling?refresh=true`,
            return_url: `${env.NEXT_PUBLIC_BASE_URL}/scheduling?success=true`,
            type: 'account_onboarding',
          })

          return {
            success: true,
            accountId: existingAccount.stripeAccountId,
            onboardingUrl: accountLink.url,
          }
        } catch (stripeError) {
          console.error('Error creating onboarding link for existing account:', stripeError)
          // If the account link creation fails, we might need to create a new account
          // This can happen if the account was deleted from Stripe but still exists in our DB
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
      type: 'express',
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
      },
    })

    // Store account info in database
    await upsertMentorStripeAccount({
      userId,
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
      payoutsEnabled: false,
      chargesEnabled: false,
    })

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${env.NEXT_PUBLIC_BASE_URL}/scheduling?refresh=true`,
      return_url: `${env.NEXT_PUBLIC_BASE_URL}/scheduling?success=true`,
      type: 'account_onboarding',
    })

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
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
    isActive: boolean
    onboardingCompleted: boolean
    payoutsEnabled: boolean
    chargesEnabled: boolean
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
          isActive: false,
          onboardingCompleted: false,
          payoutsEnabled: false,
          chargesEnabled: false,
        },
      }
    }

    return {
      success: true,
      data: {
        hasAccount: true,
        isActive: stripeAccount.stripeAccountStatus === 'active',
        onboardingCompleted: !!stripeAccount.onboardingCompleted,
        payoutsEnabled: stripeAccount.payoutsEnabled,
        chargesEnabled: stripeAccount.chargesEnabled,
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
 * Get a valid Cal.com access token
 * Automatically refreshes if expired
 */
export const getValidCalcomToken = async (): Promise<{
  success: boolean
  accessToken?: string
  error?: string
}> => {
  try {
    // First, get current tokens from database
    const tokens = await getUserCalcomTokens()
    if (!tokens) {
      return {
        success: false,
        error: 'No Cal.com tokens found',
      }
    }

    // Check if access token is expired
    const now = new Date()
    if (tokens.accessTokenExpiresAt > now) {
      // Token is still valid
      return {
        success: true,
        accessToken: tokens.accessToken,
      }
    }

    // Token is expired, refresh it
    console.log('🔄 Access token expired, refreshing...')
    const refreshResult = await refreshCalcomToken()

    if (refreshResult.success) {
      return {
        success: true,
        accessToken: refreshResult.accessToken,
      }
    }

    return {
      success: false,
      error: refreshResult.error,
    }
  } catch (error) {
    console.error('Get valid Cal.com token error:', error)
    return {
      success: false,
      error: 'Failed to get valid token',
    }
  }
}

export {
  createCalcomUser,
  forceRefreshCalcomToken,
  getCalcomAccessToken,
  getUserCalcomToken,
  hasCalcomIntegration,
  refreshCalcomToken,
  updateCalcomUser,
}
