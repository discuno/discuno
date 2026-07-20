import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin, anonymous, emailOTP, oAuthProxy, oneTap, username } from 'better-auth/plugins'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { env } from '~/env'
import { scheduleAuthBackgroundTask } from '~/lib/auth/background-tasks'
import {
  AUTH_SESSION_COOKIE_CACHE_SECONDS,
  AUTH_SESSION_FRESH_AGE_SECONDS,
  resolveActiveBetterAuthSecret,
  resolveAuthBaseURL,
  resolveBetterAuthSecretConfig,
  resolveTrustedOrigins,
} from '~/lib/auth/config'
import { sendAuthOtpEmail } from '~/lib/auth/otp-email'
import { ac, admin as adminRole, mentor, user as userRole } from '~/lib/auth/permissions'
import { betterAuthRateLimitStorage } from '~/lib/auth/rate-limit-storage'
import {
  AUTH_EMAIL_OTP_COARSE_RATE_LIMIT,
  authErrorKind,
  createAuthLogReference,
  getAuthOtpRecipient,
  hashAuthOtp,
  isAnonymousAuthEmail,
  requireOtpRecipientSendAllowance,
} from '~/lib/auth/security'
import { isValidDiscunoUsername, normalizeDiscunoUsername } from '~/lib/auth/username'
import { getLinkedAnalyticsPreferenceUpdate } from '~/lib/analytics/preference-policy'
import { downloadAndUploadProfileImage } from '~/lib/blob'
import { authOtpRecipientRatelimit } from '~/lib/rate-limiter'
import { getAllowedDomains } from '~/server/auth/domain-cache'
import { extractEduDomainPrefix, reconcileMentorAccessForUser } from '~/server/auth/mentor-access'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema/index'

const authRuntime = {
  betterAuthUrl: env.BETTER_AUTH_URL,
  configuredOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS,
  nextPublicAppUrl: env.NEXT_PUBLIC_APP_URL,
  nextPublicBaseUrl: env.NEXT_PUBLIC_BASE_URL,
  nodeEnv: env.NODE_ENV,
  productionUrl: env.BETTER_AUTH_PRODUCTION_URL,
  vercelBranchUrl: process.env.VERCEL_BRANCH_URL,
  vercelEnv: process.env.VERCEL_ENV,
  vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  vercelUrl: process.env.VERCEL_URL,
}

const authBaseURL = resolveAuthBaseURL(authRuntime)
const trustedOrigins = resolveTrustedOrigins(authRuntime)
const productionOAuthURL = env.BETTER_AUTH_PRODUCTION_URL
const authSecretConfig = resolveBetterAuthSecretConfig(
  env.BETTER_AUTH_SECRET,
  env.BETTER_AUTH_SECRETS
)
const activeAuthSecret = resolveActiveBetterAuthSecret(authSecretConfig)
const googleOAuthCallbackURL = new URL('/api/auth/callback/google', productionOAuthURL).toString()
const microsoftOAuthCallbackURL = new URL(
  '/api/auth/callback/microsoft',
  productionOAuthURL
).toString()

const logAuthError = (message: string, error?: unknown): void => {
  console.error(message, error ? { errorKind: authErrorKind(error) } : undefined)
}

const hasEduEmailSuffix = (email: string): boolean => email.toLowerCase().endsWith('.edu')

/**
 * Helper function to validate .edu email and check if school is supported
 * Used for OAuth providers (Google, Microsoft)
 */
async function validateEduEmail(email: string): Promise<void> {
  const domainPrefix = extractEduDomainPrefix(email)
  if (!domainPrefix) {
    throw new APIError('FORBIDDEN', {
      message: 'You must use a valid .edu email address to sign up.',
    })
  }

  // Check if school domain is in database
  const allowedDomains = await getAllowedDomains()

  if (!allowedDomains.has(domainPrefix)) {
    throw new APIError('FORBIDDEN', {
      message: 'Your school is not yet supported. Please contact support to add your school.',
    })
  }
}

export const auth = betterAuth({
  baseURL: authBaseURL,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: AUTH_SESSION_FRESH_AGE_SECONDS,
    cookieCache: {
      enabled: true,
      maxAge: AUTH_SESSION_COOKIE_CACHE_SECONDS,
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  // New writes use the first versioned key. The legacy secret is passed only
  // while pre-envelope values still need it and can be removed after migration.
  ...authSecretConfig,
  user: {
    additionalFields: {
      deletedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      analyticsEnabled: {
        type: 'boolean',
        required: false,
        input: false,
      },
    },
  },
  account: {
    encryptOAuthTokens: true,
  },
  verification: {
    storeIdentifier: 'hashed',
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customStorage: betterAuthRateLimitStorage,
  },
  logger: {
    disabled: false,
    disableColors: true,
    level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    // Better Auth messages and variadic arguments can contain user or provider
    // data. Keep severity and a one-way correlation reference only.
    log: (level, message) => {
      const reference = createAuthLogReference(message)
      if (level === 'error') console.error('[BetterAuth] event', { reference })
      else if (level === 'warn') console.warn('[BetterAuth] event', { reference })
      else console.info('[BetterAuth] event', { reference })
    },
  },
  appName: 'Discuno',
  advanced: {
    // Better Auth routes can return without waiting for timing-sensitive
    // delivery work while Next keeps the serverless request alive.
    backgroundTasks: {
      handler: scheduleAuthBackgroundTask,
    },
    ipAddress: {
      // Vercel owns this header, so clients cannot rotate a spoofed
      // X-Forwarded-For value to bypass Better Auth's Redis rate limits.
      ipAddressHeaders: ['x-vercel-forwarded-for'],
    },
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  trustedOrigins,
  hooks: {
    before: createAuthMiddleware(async ctx => {
      const recipient = getAuthOtpRecipient(ctx.path, ctx.body)
      if (!recipient) return

      // Enforce this before Better Auth creates or rotates the verification
      // value, otherwise a blocked send could invalidate a usable code.
      await requireOtpRecipientSendAllowance(recipient, activeAuthSecret, identifier =>
        authOtpRecipientRatelimit.limit(identifier)
      )
    }),
  },
  databaseHooks: {
    session: {
      create: {
        before: async session => {
          try {
            await reconcileMentorAccessForUser(session.userId)
          } catch (error) {
            // Authentication may continue, but mentor access remains denied.
            // A later sign-in retries the fail-closed reconciliation.
            logAuthError('[Auth mentor access] Session reconciliation failed', error)
          }
        },
      },
    },
    user: {
      create: {
        before: async user => {
          // Skip validation for anonymous users
          if (isAnonymousAuthEmail(user.email)) {
            return
          }
          // For .edu emails, validate that the school is supported
          if (hasEduEmailSuffix(user.email)) {
            await validateEduEmail(user.email)
          }
          // Non-.edu emails are allowed - they just won't be mentors
        },
        after: async user => {
          if (!user.id || !user.email) {
            logAuthError('[Auth onboarding] User record is incomplete')
            return
          }

          const isAnonymous = isAnonymousAuthEmail(user.email)

          // Skip post-creation setup for anonymous users
          if (isAnonymous) {
            return
          }

          // Better Auth's admin plugin creates ordinary users with the `user`
          // role. Promote only verified, supported school accounts and attach
          // their school through the same idempotent path used by legacy users.
          try {
            await reconcileMentorAccessForUser(user.id)
          } catch (error) {
            logAuthError('[Auth onboarding] Mentor access reconciliation failed', error)
          }

          // Process profile image for OAuth users
          if (user.image) {
            try {
              const newImageUrl = await downloadAndUploadProfileImage(user.image, user.id)
              if (newImageUrl !== user.image) {
                // Update image directly in database
                await db
                  .update(schema.user)
                  .set({ image: newImageUrl })
                  .where(eq(schema.user.id, user.id))
              }
            } catch (error) {
              logAuthError('[Auth onboarding] Profile image processing failed', error)
            }
          }

          // Create initial post for the user
          try {
            await db.insert(schema.post).values({
              createdById: user.id,
            })
          } catch (error) {
            logAuthError('[Auth onboarding] Initial post creation failed', error)
          }
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      redirectURI: googleOAuthCallbackURL,
      prompt: 'select_account',
    },
    microsoft: {
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      redirectURI: microsoftOAuthCallbackURL,
    },
  },
  plugins: [
    oAuthProxy({
      productionURL: productionOAuthURL,
      secret: env.OAUTH_PROXY_SECRET,
      maxAge: 60,
    }),
    emailOTP({
      allowedAttempts: 3,
      expiresIn: 5 * 60,
      rateLimit: {
        window: AUTH_EMAIL_OTP_COARSE_RATE_LIMIT.windowSeconds,
        max: AUTH_EMAIL_OTP_COARSE_RATE_LIMIT.max,
      },
      storeOTP: {
        hash: async otp => hashAuthOtp(otp, activeAuthSecret),
      },
      sendVerificationOTP({ email, otp, type }) {
        return sendAuthOtpEmail({
          authSecret: activeAuthSecret,
          email,
          from: env.AUTH_EMAIL_FROM,
          otp,
          type,
        })
      },
    }),
    anonymous({
      emailDomainName: 'discuno.com',
      async onLinkAccount(context) {
        const { anonymousUser, newUser } = context

        // Extract user objects from the nested structure
        const anonUser = anonymousUser.user
        const linkedUser = newUser.user

        if (!anonUser.id || !linkedUser.id) {
          logAuthError('[Anonymous account link] User record is incomplete')
          return
        }

        // Better Auth removes the guest user after this callback. Keep the
        // identity redirect and every local FK/attribution migration atomic so
        // delayed Stripe or Inngest work can still resolve the captured ID.
        try {
          await db.transaction(async tx => {
            await tx
              .insert(schema.anonymousUserLink)
              .values({ anonymousUserId: anonUser.id, linkedUserId: linkedUser.id })
              .onConflictDoNothing({ target: schema.anonymousUserLink.anonymousUserId })

            const identityLink = await tx.query.anonymousUserLink.findFirst({
              where: eq(schema.anonymousUserLink.anonymousUserId, anonUser.id),
              columns: { linkedUserId: true },
            })
            if (identityLink?.linkedUserId !== linkedUser.id) {
              throw new Error('Anonymous identity is already linked to a different account')
            }

            const anonymousRecord = await tx.query.user.findFirst({
              where: eq(schema.user.id, anonUser.id),
              columns: { stripeCustomerId: true, analyticsEnabled: true },
            })
            const linkedRecord = await tx.query.user.findFirst({
              where: eq(schema.user.id, linkedUser.id),
              columns: { stripeCustomerId: true, analyticsEnabled: true },
            })

            // The permanent account may already have an admin or another
            // explicitly assigned role. Linking guest data must never derive
            // or mutate authorization from the account's email address.

            if (anonymousRecord?.stripeCustomerId && !linkedRecord?.stripeCustomerId) {
              await tx
                .update(schema.user)
                .set({ stripeCustomerId: null, updatedAt: new Date() })
                .where(eq(schema.user.id, anonUser.id))
              await tx
                .update(schema.user)
                .set({
                  stripeCustomerId: anonymousRecord.stripeCustomerId,
                  updatedAt: new Date(),
                })
                .where(eq(schema.user.id, linkedUser.id))
            }

            // A local opt-out always wins during conversion. Copy an explicit
            // opt-in only into an account that has never stored a preference.
            const linkedAnalyticsPreference = getLinkedAnalyticsPreferenceUpdate(
              anonymousRecord?.analyticsEnabled,
              linkedRecord?.analyticsEnabled
            )

            if (linkedAnalyticsPreference !== undefined) {
              await tx
                .update(schema.user)
                .set({ analyticsEnabled: linkedAnalyticsPreference, updatedAt: new Date() })
                .where(eq(schema.user.id, linkedUser.id))
            }

            await tx
              .update(schema.bookingAttendee)
              .set({ userId: linkedUser.id, updatedAt: new Date() })
              .where(eq(schema.bookingAttendee.userId, anonUser.id))

            await tx
              .update(schema.analyticEvent)
              .set({ actorUserId: linkedUser.id, updatedAt: new Date() })
              .where(eq(schema.analyticEvent.actorUserId, anonUser.id))

            // Payment metadata has no user FK. Rewrite only paid-booking work
            // that has not established a Cal.com booking yet; completed audit
            // records remain immutable and delayed work can always use the
            // durable identity resolver.
            await tx
              .update(schema.payment)
              .set({
                metadata: sql`jsonb_set(${schema.payment.metadata}, '{checkoutSessionMetadata,actorUserId}', to_jsonb(${linkedUser.id}::text), false)`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  inArray(schema.payment.platformStatus, ['PENDING', 'PROCESSING', 'SUCCEEDED']),
                  isNull(schema.payment.calcomBookingUid),
                  sql`${schema.payment.metadata} -> 'checkoutSessionMetadata' ->> 'actorUserId' = ${anonUser.id}`
                )
              )

            // Better Auth creates the permanent session before invoking this
            // callback. Revoke every guest session atomically with the durable
            // identity migration so a best-effort plugin cleanup failure can
            // never leave the linked anonymous identity usable.
            await tx.delete(schema.session).where(eq(schema.session.userId, anonUser.id))
          })
        } catch (error) {
          logAuthError('[Anonymous account link] Account state migration failed', error)
          throw error
        }
      },
    }),
    oneTap(),
    admin({
      defaultRole: 'user',
      ac,
      roles: { admin: adminRole, user: userRole, mentor },
    }),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: isValidDiscunoUsername,
      usernameNormalization: normalizeDiscunoUsername,
    }),
    nextCookies(),
  ],
})
