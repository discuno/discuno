import { getCalcomAccessToken } from '~/app/(default)/availability/actions'
import { requireUserId } from '~/lib/auth/auth-utils'
import { CalcomProvider } from '~/lib/providers/CalProvider'

interface CalProviderWrapperProps {
  children: React.ReactNode
}

export const CalProviderWrapper = async ({ children }: CalProviderWrapperProps) => {
  const userId = await requireUserId()

  const tokenResult = await getCalcomAccessToken(userId)
  const accessToken = tokenResult.success ? (tokenResult.accessToken ?? null) : null
  const refreshToken = tokenResult.success ? (tokenResult.refreshToken ?? null) : null

  return (
    <CalcomProvider accessToken={accessToken} refreshToken={refreshToken} userId={userId}>
      {children}
    </CalcomProvider>
  )
}
