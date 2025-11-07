import { render } from '@react-email/render'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { emailOTP, oAuthProxy } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { env } from '~/env'
import { downloadAndUploadProfileImage } from '~/lib/blob'
import { OtpEmail } from '~/lib/emails/templates/OtpEmail'
import { logger } from '~/lib/logger'
import { enforceCalcomIntegration, syncMentorEventTypesForUser } from '~/server/auth/dal'
import { getAllowedDomains } from '~/server/auth/domain-cache'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema'

/**
 * Extract the primary domain prefix from an email address
 * Handles subdomains correctly (e.g., terpmail.umd.edu → umd, umd.edu → umd)
 */
function extractDomainPrefix(email: string): string | null {
  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (!emailDomain) return null

  // Extract the part immediately before .edu (ignoring subdomains)
  // Example: terpmail.umd.edu → umd, umd.edu → umd
  const match = emailDomain.match(/([^.]+)\.edu$/)
  return match?.[1] ?? null
}

/**
 * Helper function to validate .edu email and check if school is supported
 * Used for OAuth providers (Google, Microsoft)
 */
async function validateEduEmail(email: string): Promise<void> {
  logger.debug('Validating OAuth email', { email })

  // Validate .edu email format
  const eduEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$/
  if (!eduEmailRegex.test(email)) {
    logger.warn('Rejected non-.edu email', undefined, { email })
    throw new APIError('FORBIDDEN', {
      message: 'You must use a valid .edu email address to sign up.',
    })
  }

  // Check if school domain is in database
  const domainPrefix = extractDomainPrefix(email)
  const allowedDomains = await getAllowedDomains()

  if (!domainPrefix || !allowedDomains.has(domainPrefix)) {
    logger.warn('School not supported', undefined, { domainPrefix, email })
    throw new APIError('FORBIDDEN', {
      message: 'Your school is not yet supported. Please contact support to add your school.',
    })
  }

  logger.debug('Approved email for school', { domainPrefix, email })
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      deletedAt: {
        type: 'date',
        required: false,
      },
    },
  },
  logger: {
    disabled: false,
    disableColors: false,
    level: 'debug',
  },
  appName: 'Discuno',
  advanced: {
    generateId: () => crypto.randomUUID(),
  },
  trustedOrigins: ['https://*.vercel.app', 'https://*.discuno.com'],
  databaseHooks: {
    user: {
      create: {
        before: async user => {
          // Validate .edu email BEFORE user is created (works for ALL auth methods)
          await validateEduEmail(user.email)
        },
        after: async user => {
          // This runs after a new user is created in the database
          logger.info('New user created', { email: user.email })

          if (!user.id || !user.email) {
            logger.error('User missing id or email')
            return
          }

          // Process profile image for OAuth users
          if (user.image) {
            try {
              const newImageUrl = await downloadAndUploadProfileImage(user.image, user.id)
              if (newImageUrl !== user.image) {
                logger.info('Updating user image', { email: user.email })
                await db
                  .update(schema.user)
                  .set({ image: newImageUrl })
                  .where(eq(schema.user.id, user.id))
              }
            } catch (error) {
              logger.error('Error processing profile image', error, { email: user.email })
            }
          }

          // Setup Cal.com integration
          try {
            logger.info('Creating Cal.com integration', { email: user.email })
            const result = await enforceCalcomIntegration({
              userId: user.id,
              email: user.email,
              name: user.name,
              image: user.image ?? null,
            })

            if (result.success) {
              logger.info('Cal.com integration created successfully', { email: user.email })

              try {
                const syncResult = await syncMentorEventTypesForUser(user.id, result.accessToken)
                if (syncResult.success) {
                  logger.info('Synced Cal.com event types', {
                    email: user.email,
                    created: syncResult.created,
                    updated: syncResult.updated,
                    deleted: syncResult.deleted,
                  })
                } else {
                  logger.error(`Failed to sync event types: ${syncResult.error}`, undefined, {
                    email: user.email,
                  })
                }
              } catch (err) {
                logger.error('Unexpected error syncing mentor event types', err)
              }
            } else {
              logger.error(`Cal.com integration failed: ${result.error}`, undefined, {
                email: user.email,
              })
            }
          } catch (error) {
            logger.error('Error setting up Cal.com integration', error, { email: user.email })
          }

          // Assign user to school based on email domain
          const domainPrefix = extractDomainPrefix(user.email)
          if (domainPrefix) {
            try {
              const school = await db.query.school.findFirst({
                where: eq(schema.school.domainPrefix, domainPrefix),
              })

              if (school) {
                await db.insert(schema.userSchool).values({ userId: user.id, schoolId: school.id })
                logger.info('Assigned user to school', {
                  schoolName: school.name,
                  domainPrefix,
                })
              } else {
                logger.error('No school found for domain prefix', undefined, {
                  domainPrefix,
                })
              }
            } catch (error) {
              logger.error('Error assigning school', error, { email: user.email })
            }
          } else {
            logger.error('Cannot assign school: invalid email', undefined, { email: user.email })
          }

          // Create initial post for the user
          try {
            await db.insert(schema.post).values({
              createdById: user.id,
            })
            logger.info('Created initial post for user', { email: user.email })
          } catch (error) {
            logger.error('Error creating initial post', error, { email: user.email })
          }
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      redirectURI: 'https://discuno.com/api/auth/callback/google',
    },
    microsoft: {
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      redirectURI: 'https://discuno.com/api/auth/callback/microsoft',
    },
  },
  plugins: [
    oAuthProxy({
      productionURL: 'https://discuno.com',
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === 'sign-in'
            ? 'Sign in to Discuno'
            : type === 'email-verification'
              ? 'Verify your email'
              : 'Reset your password'

        const html = await render(OtpEmail({ code: otp, host: 'Discuno' }))

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.AUTH_EMAIL_FROM,
            to: email,
            subject,
            html,
          }),
        })
        if (!res.ok) {
          throw new Error('Resend error: ' + JSON.stringify(await res.json()))
        }
      },
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async ctx => {
      // Log the path for debugging
      logger.debug('Processing auth path', { path: ctx.path })
    }),
  },
})
