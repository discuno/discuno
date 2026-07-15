import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createStripeAccountLink: vi.fn(),
  createStripeConnectAccount: vi.fn(),
  createStripeLoginLink: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('~/app/(app)/(mentor)/settings/actions', () => ({
  createStripeAccountLink: mocks.createStripeAccountLink,
  createStripeConnectAccount: mocks.createStripeConnectAccount,
  createStripeLoginLink: mocks.createStripeLoginLink,
}))

import { StripeDashboardButton } from './StripeDashboardButton'

const reauthenticationResult = {
  success: false,
  error: 'Please sign in again to continue.',
  code: 'SESSION_NOT_FRESH',
  reauthUrl: '/auth?intent=mentor&reauth=1&returnTo=%2Fsettings%2Fevent-types',
}

describe('Stripe payout reauthentication UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends a stale dashboard session directly to reauthentication', async () => {
    mocks.createStripeLoginLink.mockResolvedValue(reauthenticationResult)
    const user = userEvent.setup()

    render(<StripeDashboardButton hasStripeAccount payoutsReady />)
    await user.click(screen.getByRole('button', { name: 'Open payout dashboard' }))

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(reauthenticationResult.reauthUrl))
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('reauthenticates before creating or resuming a payout account', async () => {
    mocks.createStripeConnectAccount.mockResolvedValue(reauthenticationResult)
    const user = userEvent.setup()

    render(<StripeDashboardButton hasStripeAccount={false} payoutsReady={false} />)
    await user.click(screen.getByRole('button', { name: 'Set up payouts' }))

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(reauthenticationResult.reauthUrl))
    expect(mocks.createStripeAccountLink).not.toHaveBeenCalled()
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('reauthenticates when the hosted onboarding link needs a newer session', async () => {
    mocks.createStripeConnectAccount.mockResolvedValue({ success: true })
    mocks.createStripeAccountLink.mockResolvedValue(reauthenticationResult)
    const user = userEvent.setup()

    render(<StripeDashboardButton hasStripeAccount payoutsReady={false} />)
    await user.click(screen.getByRole('button', { name: 'Finish payout setup' }))

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(reauthenticationResult.reauthUrl))
    expect(mocks.toastError).not.toHaveBeenCalled()
  })
})
