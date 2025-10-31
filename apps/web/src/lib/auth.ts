import { render } from '@react-email/render'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { emailOTP, oAuthProxy } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { env } from '~/env'
import { downloadAndUploadProfileImage } from '~/lib/blob'
import { OtpEmail } from '~/lib/emails/templates/OtpEmail'
import { enforceCalcomIntegration, syncMentorEventTypesForUser } from '~/server/auth/dal'
import { getAllowedDomains } from '~/server/auth/domain-cache'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema'

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
  trustedOrigins: ['https://*.vercel.app', 'https://*.discuno.com'],
  databaseHooks: {
    user: {
      create: {
        after: async user => {
          // This runs after a new user is created in the database
          console.log(`[DatabaseHook] New user created: ${user.email}`)

          if (!user.id || !user.email) {
            console.error('[DatabaseHook] User missing id or email')
            return
          }

          // Process profile image for OAuth users
          if (user.image) {
            try {
              const newImageUrl = await downloadAndUploadProfileImage(user.image, user.id)
              if (newImageUrl !== user.image) {
                console.log(`[DatabaseHook] Updating user image for: ${user.email}`)
                await db
                  .update(schema.user)
                  .set({ image: newImageUrl })
                  .where(eq(schema.user.id, user.id))
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
          const emailDomain = user.email.split('@')[1]?.toLowerCase()
          if (emailDomain) {
            try {
              const domainPrefix = emailDomain.replace('.edu', '')
              const school = await db.query.school.findFirst({
                where: eq(schema.school.domainPrefix, domainPrefix),
              })

              if (school) {
                await db.insert(schema.userSchool).values({ userId: user.id, schoolId: school.id })
                console.log(
                  `[DatabaseHook] Assigned user to school ${school.name} (domain: ${emailDomain})`
                )
              } else {
                console.error(
                  `[DatabaseHook] No school found for domain: ${emailDomain}. User not assigned.`
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
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
    microsoft: {
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
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
      // Validate .edu email domain for sign-up and sign-in endpoints
      const signUpPaths = ['/sign-up/email', '/callback/google', '/callback/microsoft']
      const signInPaths = ['/sign-in/email-otp']

      if (
        signUpPaths.some(path => ctx.path.startsWith(path)) ||
        signInPaths.some(path => ctx.path.startsWith(path))
      ) {
        const email = ctx.body?.email ?? ctx.context.newSession?.user.email

        if (email) {
          // Ensure the user has a valid .edu email format
          const eduEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$/
          if (!eduEmailRegex.test(email)) {
            console.log(`Sign-in rejected for invalid .edu email format: ${email}`)
            throw ctx.redirect('/auth/rejected')
          }

          // Check if email domain matches a known school domain
          const emailDomain = email.split('@')[1]?.toLowerCase()
          console.log(`🔍 [SignIn] Checking domain: ${emailDomain}`)

          const domainPrefix = emailDomain?.replace('.edu', '')
          console.log(`🔍 [SignIn] Domain prefix: ${domainPrefix}`)

          const allowedDomains = await getAllowedDomains()
          console.log(`🔍 [SignIn] Allowed domains count: ${allowedDomains.size}`)

          if (!domainPrefix || !allowedDomains.has(domainPrefix)) {
            console.error(
              `❌ [SignIn] REJECTED .edu domain not in database: ${domainPrefix} (full domain: ${emailDomain}, email: ${email})`
            )
            console.error(
              `[SignIn] Action required: Add school with domain prefix '${domainPrefix}' to the database`
            )
            throw ctx.redirect('/auth/rejected')
          }

          console.log(`✅ [SignIn] Approved for recognized school domain prefix: ${domainPrefix}`)
        }
      }
    }),
  },
})
