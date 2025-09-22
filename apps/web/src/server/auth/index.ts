import 'server-only'

import NextAuth from 'next-auth'

import { authConfig } from '~/server/auth/config'

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)
