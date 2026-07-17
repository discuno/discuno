import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendVerificationOtp: vi.fn(),
  signInWithOtp: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}))

vi.mock('~/lib/auth-client', () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: mocks.sendVerificationOtp },
    signIn: { emailOtp: mocks.signInWithOtp },
  },
}))

import { EmailSignInForm } from './EmailSignInForm'

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
Object.defineProperty(document, 'elementFromPoint', {
  configurable: true,
  value: vi.fn(() => null),
})

describe('EmailSignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendVerificationOtp.mockResolvedValue({
      data: { success: true },
      error: null,
    })
  })

  it('requests a one-time code for a valid school email and reveals the OTP step', async () => {
    const user = userEvent.setup()

    render(<EmailSignInForm />)

    await user.type(screen.getByRole('textbox', { name: 'School email' }), 'mentor@umich.edu')
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in code' }))

    await waitFor(() =>
      expect(mocks.sendVerificationOtp).toHaveBeenCalledWith({
        email: 'mentor@umich.edu',
        type: 'sign-in',
      })
    )
    expect(screen.getByText('Check your school inbox')).toBeTruthy()
    expect(screen.getByText(/mentor@umich\.edu/)).toBeTruthy()
  })

  it('keeps non-school addresses out of the OTP request', async () => {
    const user = userEvent.setup()

    render(<EmailSignInForm />)

    await user.type(screen.getByRole('textbox', { name: 'School email' }), 'mentor@gmail.com')

    expect(screen.getByText('Enter a valid school-issued .edu email address.')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Email me a sign-in code' }).hasAttribute('disabled')
    ).toBe(true)
    expect(mocks.sendVerificationOtp).not.toHaveBeenCalled()
  })
})
