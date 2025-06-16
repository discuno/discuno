'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useCalApi } from '../provider/cal-provider'
import type { Credential } from '../types'

interface OAuthConnectProps {
  appSlug: string
  redirectUri?: string
  onSuccess?: (credential: Credential) => void
  onError?: (error: Error) => void
  className?: string
  children?: React.ReactNode
}

export function OAuthConnect({
  appSlug,
  redirectUri,
  onSuccess,
  onError,
  className,
  children,
}: OAuthConnectProps) {
  const { apiClient } = useCalApi()
  const queryClient = useQueryClient()
  const [isConnecting, setIsConnecting] = useState(false)

  // Get app information
  const { data: apps } = useQuery({
    queryKey: ['apps'],
    queryFn: () => {
      if (!apiClient) throw new Error('API client not available')
      return apiClient.getApps()
    },
    enabled: !!apiClient,
  })

  const app = apps?.find(a => a.slug === appSlug)

  // Handle OAuth flow
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!apiClient) throw new Error('API client not available')
      const currentUrl = new URL(window.location.href)
      const redirect =
        redirectUri ?? `${currentUrl.protocol}//${currentUrl.host}${currentUrl.pathname}`

      const { url } = await apiClient.getOAuthUrl(appSlug, redirect)
      return url
    },
    onSuccess: authUrl => {
      // Redirect to OAuth provider
      window.location.href = authUrl
    },
    onError: error => {
      setIsConnecting(false)
      onError?.(error instanceof Error ? error : new Error('Failed to initiate OAuth flow'))
    },
  })

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')

      if (error) {
        onError?.(new Error(`OAuth error: ${error}`))
        return
      }

      if (code && apiClient) {
        try {
          const credential = await apiClient.handleOAuthCallback(appSlug, code, state ?? undefined)
          void queryClient.invalidateQueries({ queryKey: ['credentials'] })
          onSuccess?.(credential)

          // Clean up URL
          const cleanUrl = window.location.href.split('?')[0]
          window.history.replaceState({}, document.title, cleanUrl)
        } catch (err) {
          onError?.(err instanceof Error ? err : new Error('Failed to complete OAuth flow'))
        }
      }
    }

    void handleOAuthCallback()
  }, [apiClient, appSlug, onSuccess, onError, queryClient])

  const handleConnect = () => {
    if (!apiClient) return
    setIsConnecting(true)
    connectMutation.mutate()
  }

  if (!apiClient) {
    return (
      <Button disabled className={className}>
        API not available
      </Button>
    )
  }

  if (children) {
    return (
      <div onClick={handleConnect} className={className}>
        {children}
      </div>
    )
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting || connectMutation.isPending}
      className={className}
    >
      {isConnecting || connectMutation.isPending ? (
        <>
          <span className="mr-2 animate-spin">⟳</span>
          Connecting...
        </>
      ) : (
        <>Connect {app?.name ?? appSlug}</>
      )}
    </Button>
  )
}

// Specific implementations for common integrations
export function GoogleCalendarConnect(props: Omit<OAuthConnectProps, 'appSlug'>) {
  return <OAuthConnect {...props} appSlug="google-calendar" />
}

export function OutlookCalendarConnect(props: Omit<OAuthConnectProps, 'appSlug'>) {
  return <OAuthConnect {...props} appSlug="office365-calendar" />
}

export function ZoomConnect(props: Omit<OAuthConnectProps, 'appSlug'>) {
  return <OAuthConnect {...props} appSlug="zoom" />
}

export function SlackConnect(props: Omit<OAuthConnectProps, 'appSlug'>) {
  return <OAuthConnect {...props} appSlug="slack" />
}
