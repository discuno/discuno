import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ socialSignIn: vi.fn() }))

vi.mock('~/lib/auth-client', () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: vi.fn() },
    signIn: { emailOtp: vi.fn(), social: mocks.socialSignIn },
  },
}))

import { LoginPage } from './LoginPage'

describe('fresh-session sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.socialSignIn.mockResolvedValue({ data: { redirect: true }, error: null })
  })

  it('explains the extra check and preserves the safe resume path through OAuth', async () => {
    const user = userEvent.setup()

    render(
      <LoginPage
        initialUserType="mentor"
        reauthenticationRequired
        returnTo="/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar"
      />
    )

    expect(screen.getByRole('heading', { name: 'Sign in again to continue' })).toBeTruthy()
    expect(screen.getByText(/extra check protects changes/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Continue with Google school account' }))

    await waitFor(() =>
      expect(mocks.socialSignIn).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar',
      })
    )
  })

  it('preserves a normal post-sign-in resume path without showing reauthentication copy', async () => {
    const user = userEvent.setup()

    render(
      <LoginPage
        initialUserType="mentor"
        returnTo="/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar"
      />
    )

    expect(screen.getByRole('heading', { name: 'Share what you have learned' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Sign in again to continue' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Continue with Google school account' }))

    await waitFor(() =>
      expect(mocks.socialSignIn).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/api/integrations/calcom/connect?returnTo=%2Fsettings%2Fcalendar',
      })
    )
  })
})
