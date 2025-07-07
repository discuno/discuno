import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { type DefaultSession, type NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

// import EmailProvider from "next-auth/providers/nodemailer";
import { env } from '~/env'

import { eq } from 'drizzle-orm'
import { downloadAndUploadProfileImage } from '~/lib/blob'
import { enforceCalcomIntegration } from '~/server/auth/dal'
import { db } from '~/server/db'
import {
  accounts,
  schools,
  sessions,
  users,
  userSchools,
  verificationTokens,
} from '~/server/db/schema'

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      // ...other properties
      // role: UserRole;
    } & DefaultSession['user']
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      allowDangerousEmailAccountLinking: true, // Ok because trusted
    }),
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    // Email provider cannot run in edge runtime in middleware
    /*EmailProvider({
      server: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: {
          user: env.SMTP_USER,
          pass: env.SENDGRID_API_KEY,
        },
      },
      from: env.AUTH_EMAIL_FROM,
    }),*/
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  session: {
    maxAge: 2 * 60 * 60, // 2 hours
    updateAge: 30 * 60, // 30 minutes
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  pages: {
    error: '/auth/error',
    signIn: '/auth',
  },
  callbacks: {
    session: ({ session, user }: { session: DefaultSession; user: { id: string } }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
    async signIn({ user }) {
      try {
        // Only allow .edu email addresses
        if (!user.email?.endsWith('.edu')) {
          console.log(`Sign-in rejected for non-.edu email: ${user.email ?? 'unknown'}`)
          // Redirect to rejection page
          return '/auth/rejected'
        }

        // Ensure the user has a valid .edu email format
        const eduEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$/
        if (!eduEmailRegex.test(user.email)) {
          console.log(`Sign-in rejected for invalid .edu email format: ${user.email ?? 'unknown'}`)
          return '/auth/rejected'
        }

        // Extract and validate email domain
        const email = user.email || ''
        const parts = email.split('@')
        if (parts.length < 2) {
          console.log(`Sign-in rejected for invalid email: ${email}`)
          return '/auth/rejected'
        }
        const emailDomain = parts[1]?.toLowerCase() ?? ''
        const school = await db.query.schools.findFirst({
          where: eq(schools.domain, emailDomain),
        })
        if (!school) {
          console.log(`Sign-in rejected for unrecognized school domain: ${emailDomain}`)
          return '/auth/rejected'
        }
        console.log(`Sign-in approved for recognized school domain: ${emailDomain}`)
        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return '/auth/error'
      }
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.id && user.email && user.image) {
        console.log(`New user signed in, processing profile image: ${user.email ?? 'unknown'}`)

        // Download the image and upload it to Vercel Blob
        const newImageUrl = await downloadAndUploadProfileImage(user.image, user.id)

        if (newImageUrl !== user.image) {
          console.log(`Updating user image in database for: ${user.email ?? 'unknown'}`)
          // Update the user's image URL in the database
          await db.update(users).set({ image: newImageUrl }).where(eq(users.id, user.id))
          user.image = newImageUrl // Update the user object for the next step
        }
      }

      // This event is called AFTER the user record is created in the database
      if (user.id && user.email) {
        console.log(
          `Creating Cal.com integration for user: ${user.email ?? 'unknown'} (isNewUser: ${isNewUser})`
        )

        const result = await enforceCalcomIntegration({
          userId: user.id,
          email: user.email || '',
          name: user.name ?? null,
          image: user.image ?? null,
        })

        if (result.success) {
          console.log(`Cal.com integration created successfully for: ${user.email ?? 'unknown'}`)
        } else {
          console.error(
            `Cal.com integration failed for: ${user.email ?? 'unknown'} - ${result.error}`
          )
        }
      }

      // Assign user to school based on email domain if new user
      if (isNewUser && user.id && user.email) {
        // Extract and validate email domain
        const email = user.email || ''
        const parts = email.split('@')
        if (parts.length < 2) {
          console.error(`Cannot assign school: invalid email ${email}`)
        } else {
          const emailDomain = parts[1]?.toLowerCase() ?? ''
          const school = await db.query.schools.findFirst({
            where: eq(schools.domain, emailDomain),
          })
          if (school) {
            await db.insert(userSchools).values({ userId: user.id, schoolId: school.id })
            console.log(`Assigned user to school ${school.name} (domain: ${emailDomain})`)
          } else {
            console.error(`No school found for domain: ${emailDomain}. User not assigned.`)
          }
        }
      }
    },
  },
  secret: env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig
