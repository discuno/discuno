import { CalcomProvider } from '~/lib/providers/CalProvider'
import { getUserCalcomTokens } from '~/server/queries'

interface CalProviderWrapperProps {
  children: React.ReactNode
  // For booking flows - provide mentor's tokens explicitly
  mentorAccessToken?: string | null
  mentorRefreshToken?: string | null
  // When true, will fetch current user's tokens (for mentor dashboards)
  useCurrentUserTokens?: boolean
}

export const CalProviderWrapper = async ({
  children,
  mentorAccessToken,
  mentorRefreshToken,
  useCurrentUserTokens = false,
}: CalProviderWrapperProps) => {
  let tokens: {
    accessToken: string | null
    refreshToken: string | null
  } = {
    accessToken: null,
    refreshToken: null,
  }

  // If mentor tokens are provided explicitly (booking flow), use those
  if (mentorAccessToken) {
    tokens = {
      accessToken: mentorAccessToken,
      refreshToken: mentorRefreshToken ?? null,
    }
  }
  // Otherwise, if useCurrentUserTokens is true, fetch current user's tokens (mentor dashboard)
  else if (useCurrentUserTokens) {
    try {
      const calcomTokens = await getUserCalcomTokens()
      if (calcomTokens) {
        tokens = {
          accessToken: calcomTokens.accessToken,
          refreshToken: calcomTokens.refreshToken,
        }
      }
    } catch (error) {
      // User not authenticated or no tokens found - this is expected for new users
      console.warn('No Cal.com tokens found (this is normal for new users):', error)
    }
  }

  return (
    <CalcomProvider accessToken={tokens.accessToken} refreshToken={tokens.refreshToken}>
      {children}
    </CalcomProvider>
  )
}
