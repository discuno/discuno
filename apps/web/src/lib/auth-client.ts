import {
  adminClient,
  anonymousClient,
  emailOTPClient,
  inferAdditionalFields,
  oneTapClient,
  usernameClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env } from '~/env'
import type { auth } from '~/lib/auth'
import { ac, admin as adminRole, mentor, user as userRole } from '~/lib/auth/permissions'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
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
    usernameClient(),
  ],
})

export const { signIn, signOut, useSession } = authClient
