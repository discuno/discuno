'use client'

import { CalProvider } from '@discuno/atoms'
import '@discuno/atoms/globals.css'
import { env } from '~/env'

interface CalcomProviderProps {
  children: React.ReactNode
  accessToken: string | null
  refreshToken?: string | null
  userId?: string
}

export const CalcomProvider = ({
  children,
  accessToken,
  refreshToken,
  userId: _userId,
}: CalcomProviderProps) => {
  const config = {
    apiUrl: env.NEXT_PUBLIC_CALCOM_API_URL,
    accessToken: accessToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
    refreshUrl: accessToken ? `${env.NEXT_PUBLIC_BASE_URL}/api/auth/calcom/refresh` : undefined,
    clientId: env.NEXT_PUBLIC_X_CAL_ID,
    webAppUrl: 'https://cal.com',
  }

  return (
    <CalProvider
      config={config}
      onError={error => {
        console.error('Cal.com API Error:', error)
        // For demo purposes, we'll be more tolerant of API errors
      }}
    >
      {children}
    </CalProvider>
  )
}
