'use client'

import { CalProvider } from '@calcom/atoms'
import '@calcom/atoms/globals.min.css'
import { env } from '~/env'

interface CalcomProviderProps {
  children: React.ReactNode
  accessToken: string | null
  refreshToken?: string | null
}

export const CalcomProvider = ({ children, accessToken }: CalcomProviderProps) => {
  return (
    <CalProvider
      clientId={env.NEXT_PUBLIC_X_CAL_ID}
      options={{
        apiUrl: env.NEXT_PUBLIC_CALCOM_API_URL,
        refreshUrl: `${env.NEXT_PUBLIC_BASE_URL}/api/auth/calcom/refresh`,
      }}
      accessToken={accessToken ?? undefined}
    >
      {children}
    </CalProvider>
  )
}
