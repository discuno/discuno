'use client'

import { useEffect, useState } from 'react'
import { CalcomProvider } from '~/lib/providers/CalProvider'

interface CalProviderWrapperProps {
  children: React.ReactNode
}

export const CalProviderWrapper = ({ children }: CalProviderWrapperProps) => {
  const [tokens, setTokens] = useState<{
    accessToken: string | null
    refreshToken: string | null
  }>({
    accessToken: null,
    refreshToken: null,
  })

  useEffect(() => {
    // Client-side token fetching to avoid dynamic server usage during build
    const fetchTokens = async () => {
      try {
        // This will be handled by client-side authentication state
        // For now, we'll start with null tokens and let the Cal provider handle auth
        setTokens({
          accessToken: null,
          refreshToken: null,
        })
      } catch (error) {
        console.warn('Failed to fetch Cal.com tokens:', error)
        setTokens({
          accessToken: null,
          refreshToken: null,
        })
      }
    }

    void fetchTokens()
  }, [])

  return (
    <CalcomProvider accessToken={tokens.accessToken} refreshToken={tokens.refreshToken}>
      {children}
    </CalcomProvider>
  )
}
