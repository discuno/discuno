import { getCalcomAccessToken } from '~/app/(default)/availability/actions'
import { CalcomProvider } from '~/lib/providers/CalProvider'
import { requireAuth } from '~/lib/auth/auth-utils'

interface CalProviderWrapperProps {
  children: React.ReactNode
}

export const CalProviderWrapper = async ({ children }: CalProviderWrapperProps) => {
  const { id: userId } = await requireAuth()

  const tokenResult = await getCalcomAccessToken(userId)
  const accessToken = tokenResult.success ? (tokenResult.accessToken ?? null) : null
  const refreshToken = tokenResult.success ? (tokenResult.refreshToken ?? null) : null

  return (
    <CalcomProvider accessToken={accessToken} refreshToken={refreshToken} userId={userId}>
      {children}
    </CalcomProvider>
  )
}
