import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmailVerificationShell } from './components/EmailVerificationShell'

// Mock the dynamic content component
vi.mock('./components/EmailVerificationContent', () => ({
  EmailVerificationContent: ({ searchParams }: { searchParams: { status?: string } }) => (
    <div data-testid="email-verification-content">Status: {searchParams.status ?? 'none'}</div>
  ),
}))

// Mock the loading spinner
vi.mock('~/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('EmailVerificationShell', () => {
  it('renders static header immediately', () => {
    render(<EmailVerificationShell searchParams={{}} />)

    expect(screen.getByText('Verify Your Email')).toBeInTheDocument()
    expect(
      screen.getByText('Complete your verification to access mentor features')
    ).toBeInTheDocument()
  })

  it('passes search params to content component', () => {
    render(<EmailVerificationShell searchParams={{ status: 'sent' }} />)

    expect(screen.getByTestId('email-verification-content')).toBeInTheDocument()
    expect(screen.getByText('Status: sent')).toBeInTheDocument()
  })

  it('handles empty search params', () => {
    render(<EmailVerificationShell searchParams={{}} />)

    expect(screen.getByTestId('email-verification-content')).toBeInTheDocument()
    expect(screen.getByText('Status: none')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(<EmailVerificationShell searchParams={{}} />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('container', 'mx-auto', 'max-w-2xl', 'px-4', 'py-8')
  })
})
