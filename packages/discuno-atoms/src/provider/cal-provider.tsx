'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CalApiConfig, AtomsGlobalConfig } from '../types'
import { CalApiClient, createApiClient } from '../lib/api-client'

interface CalContextValue {
  apiClient: CalApiClient | null
  config: AtomsGlobalConfig
  isAuthenticated: boolean
  user: any | null
  error: string | null
  refreshAuth: () => Promise<void>
}

const CalContext = createContext<CalContextValue | null>(null)

interface CalProviderProps {
  children: React.ReactNode
  config: CalApiConfig & AtomsGlobalConfig
  onError?: (error: Error) => void
}

export function CalProvider({ children, config, onError }: CalProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Prevent hydration issues
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
          // Don't retry on 401/403 errors
          if (error instanceof Error && error.message.includes('401') || error.message.includes('403')) {
            return false
          }
          return failureCount < 3
        },
        refetchOnMount: false, // Prevent automatic refetching on mount
        refetchOnWindowFocus: false, // Prevent refetching on window focus
      },
    },
  }))

  // In test environment, assume we're hydrated immediately
  const [isHydrated, setIsHydrated] = useState(typeof window !== 'undefined' && process.env.NODE_ENV === 'test')
  const [apiClient, setApiClient] = useState<CalApiClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Track hydration status
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Initialize API client synchronously to avoid hydration issues, but only after hydration
  const apiClientMemo = useMemo(() => {
    // During SSR, don't initialize the API client (unless in test environment)
    if (!isHydrated) {
      return null
    }

    if (config.apiUrl && config.accessToken) {
      try {
        const client = createApiClient({
          apiUrl: config.apiUrl,
          accessToken: config.accessToken,
          refreshToken: config.refreshToken,
          refreshUrl: config.refreshUrl,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
        })
        return client
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize API client'
        onError?.(new Error(errorMessage))
        return null
      }
    }
    return null
  }, [isHydrated, config.apiUrl, config.accessToken, config.refreshToken, config.refreshUrl, config.clientId, config.clientSecret, onError])

  // Update state when memo changes
  useEffect(() => {
    setApiClient(apiClientMemo)
    if (!apiClientMemo && isHydrated && !config.accessToken) {
      setError('No access token available')
    } else if (apiClientMemo) {
      setError(null)
    }
  }, [apiClientMemo, config.accessToken, isHydrated])

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (!apiClient || !config.accessToken || !isHydrated) {
        setIsAuthenticated(false)
        setUser(null)
        return
      }

      try {
        const userData = await apiClient.getMe()
        setUser(userData)
        setIsAuthenticated(true)
        setError(null)
      } catch (err) {
        // Handle token expiration
        if (err instanceof Error && (
          err.message.includes('TokenExpiredException') ||
          err.message.includes('ACCESS_TOKEN_IS_EXPIRED') ||
          err.message.includes('401')
        )) {
          console.warn('Access token expired, attempting refresh...')

          // Try to refresh token if refresh URL is available
          if (config.refreshUrl && config.accessToken) {
            try {
              const refreshResponse = await fetch(config.refreshUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${config.accessToken}`,
                  'Content-Type': 'application/json',
                },
              })

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json()
                if (refreshData.accessToken) {
                  console.log('Token refreshed successfully')
                  // Note: In a real implementation, you'd update the token in your auth state
                  // For now, just fall back to demo mode
                }
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError)
            }
          }

          // Token refresh failed, user needs to reconnect
          console.warn('Token refresh failed, user needs to reconnect')
          setIsAuthenticated(false)
          setUser(null)
          setError('Authentication failed. Please reconnect your Cal.com account.')
          return
        }

        setIsAuthenticated(false)
        setUser(null)
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        setError(errorMessage)
      }
    }

    checkAuth()
  }, [apiClient, config.accessToken, config.refreshUrl, isHydrated])

  const refreshAuth = async () => {
    if (!apiClient || !config.refreshToken) {
      throw new Error('Cannot refresh authentication: missing API client or refresh token')
    }

    try {
      const tokens = await apiClient.refreshToken(config.refreshToken)
      // Note: In a real app, you'd want to update the tokens in your auth state/storage
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh authentication'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const contextValue = useMemo<CalContextValue>(() => ({
    apiClient,
    config: {
      webAppUrl: config.webAppUrl || 'https://cal.com',
      apiUrl: config.apiUrl || 'https://api.cal.com/v2',
    },
    isAuthenticated,
    user,
    error,
    refreshAuth,
  }), [apiClient, config.webAppUrl, config.apiUrl, isAuthenticated, user, error])

  return (
    <QueryClientProvider client={queryClient}>
      <CalContext.Provider value={contextValue}>
        {children}
      </CalContext.Provider>
    </QueryClientProvider>
  )
}

export function useCalContext() {
  const context = useContext(CalContext)
  if (!context) {
    throw new Error('useCalContext must be used within a CalProvider')
  }
  return context
}

export function useCal() {
  return useCalContext()
}

// Export individual hooks for specific needs
export function useCalApi() {
  const { apiClient, isAuthenticated, error } = useCalContext()
  return { apiClient, isAuthenticated }
}

export function useCalConfig() {
  const { config } = useCalContext()
  return config
}

export function useCalAuth() {
  const { isAuthenticated, user, error, refreshAuth } = useCalContext()
  return { isAuthenticated, user, error, refreshAuth }
}
