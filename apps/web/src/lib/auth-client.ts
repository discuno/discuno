import {
  adminClient,
  anonymousClient,
  emailOTPClient,
  oneTapClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env } from '~/env'
import { ac, admin as adminRole, mentor, user as userRole } from '~/lib/auth/permissions'

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    anonymousClient(),
    oneTapClient({
      clientId: env.NEXT_PUBLIC_AUTH_GOOGLE_ID,
      cancelOnTapOutside: false,
    }),
    adminClient({
      ac,
      roles: { admin: adminRole, user: userRole, mentor },
    }),
  ],
})

export const { signIn, signOut, useSession } = authClient
