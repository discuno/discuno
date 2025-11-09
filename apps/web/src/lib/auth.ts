import { render } from '@react-email/render'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { admin, anonymous, emailOTP, oAuthProxy, oneTap } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { env } from '~/env'
import { ac, admin as adminRole, mentor, user as userRole } from '~/lib/auth/permissions'
import { downloadAndUploadProfileImage } from '~/lib/blob'
import { OtpEmail } from '~/lib/emails/templates/OtpEmail'
import { identifyUser, trackServerEvent } from '~/lib/posthog-server'
import { enforceCalcomIntegration, syncMentorEventTypesForUser } from '~/server/auth/dal'
import { getAllowedDomains } from '~/server/auth/domain-cache'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema/index'

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
  console.log(`[OAuth] Validating email: ${email}`)

  // Validate .edu email format
  const eduEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$/
  if (!eduEmailRegex.test(email)) {
    console.error(`❌ [OAuth] Rejected non-.edu email: ${email}`)
    throw new APIError('FORBIDDEN', {
      message: 'You must use a valid .edu email address to sign up.',
    })
  }

  // Check if school domain is in database
  const domainPrefix = extractDomainPrefix(email)
  const allowedDomains = await getAllowedDomains()

  if (!domainPrefix || !allowedDomains.has(domainPrefix)) {
    console.error(`❌ [OAuth] School not supported: ${domainPrefix} (email: ${email})`)
    throw new APIError('FORBIDDEN', {
      message: 'Your school is not yet supported. Please contact support to add your school.',
    })
  }

  console.log(`✅ [OAuth] Approved email for school: ${domainPrefix}`)
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
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  trustedOrigins: ['https://*.vercel.app', 'https://*.discuno.com'],
  databaseHooks: {
    user: {
      create: {
        before: async user => {
          // Skip validation for anonymous users
          if (user.email.includes('@discuno.com')) {
            return
          }
          // For .edu emails, validate that the school is supported
          if (user.email.endsWith('.edu')) {
            await validateEduEmail(user.email)
          }
          // Non-.edu emails are allowed - they just won't be mentors
        },
        after: async user => {
          // This runs after a new user is created in the database
          console.log(`[DatabaseHook] New user created: ${user.email}`)

          if (!user.id || !user.email) {
            console.error('[DatabaseHook] User missing id or email')
            return
          }

          // Assign role based on email domain FIRST (for all users)
          // .edu emails get 'mentor' role, others get 'user' role, anonymous users get no role
          const isAnonymous = user.email.includes('@discuno.com')
          if (!isAnonymous) {
            const role = user.email.endsWith('.edu') ? 'mentor' : 'user'
            console.log(`[DatabaseHook] Attempting to assign role '${role}' to user: ${user.email}`)

            try {
              // Use BetterAuth's admin API to set role
              const result = await auth.api.setRole({
                body: {
                  userId: user.id,
                  role,
                },

                headers: await headers(),
              })
              console.log(`[DatabaseHook] ✅ Role assignment result:`, result)
            } catch (error) {
              console.error(`[DatabaseHook] ❌ Error assigning role for ${user.email}:`, error)
              // Fallback to direct DB update if admin API fails
              console.log(`[DatabaseHook] Falling back to direct DB update for role assignment`)
              await db.update(schema.user).set({ role }).where(eq(schema.user.id, user.id))
              console.log(`[DatabaseHook] ✅ Role assigned via fallback for: ${user.email}`)
            }
          }

          // Skip post-creation setup for anonymous users
          if (isAnonymous) {
            console.log(`[DatabaseHook] Skipping setup for anonymous user: ${user.email}`)
            return
          }

          // Process profile image for OAuth users
          if (user.image) {
            try {
              const newImageUrl = await downloadAndUploadProfileImage(user.image, user.id)
              if (newImageUrl !== user.image) {
                console.log(`[DatabaseHook] Updating user image for: ${user.email}`)
                // Use BetterAuth's admin API to update user data
                await auth.api.adminUpdateUser({
                  body: {
                    userId: user.id,
                    data: { image: newImageUrl },
                  },
                })
              }
            } catch (error) {
              console.error(
                `[DatabaseHook] Error processing profile image for ${user.email}:`,
                error
              )
            }
          }

          // Setup Cal.com integration
          try {
            console.log(`[DatabaseHook] Creating Cal.com integration for: ${user.email}`)
            const result = await enforceCalcomIntegration({
              userId: user.id,
              email: user.email,
              name: user.name,
              image: user.image ?? null,
            })

            if (result.success) {
              console.log(
                `[DatabaseHook] Cal.com integration created successfully for: ${user.email}`
              )

              try {
                const syncResult = await syncMentorEventTypesForUser(user.id, result.accessToken)
                if (syncResult.success) {
                  console.log(
                    `[DatabaseHook] Synced Cal.com event types for ${user.email}: ` +
                      `created=${syncResult.created}, updated=${syncResult.updated}, deleted=${syncResult.deleted}`
                  )
                } else {
                  console.error(
                    `[DatabaseHook] Failed to sync event types for ${user.email}: ${syncResult.error}`
                  )
                }
              } catch (err) {
                console.error('[DatabaseHook] Unexpected error syncing mentor event types:', err)
              }
            } else {
              console.error(
                `[DatabaseHook] Cal.com integration failed for: ${user.email} - ${result.error}`
              )
            }
          } catch (error) {
            console.error(
              `[DatabaseHook] Error setting up Cal.com integration for ${user.email}:`,
              error
            )
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
                console.log(
                  `[DatabaseHook] Assigned user to school ${school.name} (domain prefix: ${domainPrefix})`
                )
              } else {
                console.error(
                  `[DatabaseHook] No school found for domain prefix: ${domainPrefix}. User not assigned.`
                )
              }
            } catch (error) {
              console.error(`[DatabaseHook] Error assigning school for ${user.email}:`, error)
            }
          } else {
            console.error(`[DatabaseHook] Cannot assign school: invalid email ${user.email}`)
          }

          // Create initial post for the user
          try {
            await db.insert(schema.post).values({
              createdById: user.id,
            })
            console.log(`[DatabaseHook] Created initial post for user: ${user.email}`)
          } catch (error) {
            console.error(`[DatabaseHook] Error creating initial post for ${user.email}:`, error)
          }

          // Track user signup in PostHog
          try {
            await identifyUser(user.id, {
              email: user.email,
              name: user.name,
              createdAt: new Date().toISOString(),
            })
            await trackServerEvent(user.id, 'user_signed_up', {
              email: user.email,
              name: user.name,
              hasImage: !!user.image,
            })
          } catch (error) {
            console.error(`[DatabaseHook] Error tracking signup event for ${user.email}:`, error)
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
    anonymous({
      emailDomainName: 'discuno.com',
      async onLinkAccount(context) {
        console.log(`[Anonymous] onLinkAccount triggered`)

        const { anonymousUser, newUser } = context

        // Extract user objects from the nested structure
        const anonUser = anonymousUser.user
        const linkedUser = newUser.user

        console.log(`[Anonymous] Anonymous user: ${anonUser.email}`)
        console.log(
          `[Anonymous] Linked user: ${linkedUser.email}, current role: ${linkedUser.role}`
        )

        if (!anonUser.id || !linkedUser.id) {
          console.log('[Anonymous] ⚠️  Missing user data in onLinkAccount')
          return
        }

        // Assign role based on email domain when linking account
        if (linkedUser.email && !linkedUser.email.includes('@discuno.com')) {
          const role = linkedUser.email.endsWith('.edu') ? 'mentor' : 'user'
          console.log(`[Anonymous] 🔧 Assigning role '${role}' to linked user: ${linkedUser.email}`)

          try {
            // Use BetterAuth's admin API to set role
            await auth.api.setRole({
              body: {
                userId: linkedUser.id,
                role,
              },
              headers: await headers(),
            })
            console.log(
              `[Anonymous] ✅ Role '${role}' assigned successfully to ${linkedUser.email}`
            )
          } catch (error) {
            console.error(`[Anonymous] ❌ Error assigning role via BetterAuth API:`, error)
          }
        }

        // Migrate analytics events from anonymous user to linked user
        try {
          const events = await db
            .select({ id: schema.analyticEvent.id })
            .from(schema.analyticEvent)
            .where(eq(schema.analyticEvent.actorUserId, anonUser.id))
            .limit(1)

          if (events.length > 0) {
            await db
              .update(schema.analyticEvent)
              .set({ actorUserId: linkedUser.id })
              .where(eq(schema.analyticEvent.actorUserId, anonUser.id))
            console.log(
              `[Anonymous] ✅ Migrated analytics events from ${anonUser.id} to ${linkedUser.id}`
            )
          } else {
            console.log(`[Anonymous] No analytics events to migrate`)
          }
        } catch (error) {
          console.error('[Anonymous] ❌ Error migrating analytics events:', error)
        }
      },
    }),
    oneTap(),
    admin({
      defaultRole: 'user',
      ac,
      roles: { admin: adminRole, user: userRole, mentor },
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async ctx => {
      // Log the path for debugging
      console.log(`[AuthHook] Processing path: ${ctx.path}`)
    }),
  },
})
