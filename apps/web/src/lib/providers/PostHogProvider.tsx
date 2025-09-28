'use client'

import { useEffect } from 'react'
import { env } from '~/env'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export const PostHogProvider = ({
  children,
  anonymousId,
}: {
  children: React.ReactNode
  anonymousId?: string
}) => {
  useEffect(() => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'always',
      defaults: '2025-05-24',
    })
    if (anonymousId) {
      posthog.identify(anonymousId)
    }
  }, [anonymousId])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
