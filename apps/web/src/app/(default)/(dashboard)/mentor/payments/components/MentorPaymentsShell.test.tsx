import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MentorPaymentsShell } from './MentorPaymentsShell'

describe('MentorPaymentsShell', () => {
  it('renders the shell with title and description', () => {
    render(
      <MentorPaymentsShell>
        <div data-testid="test-content">Test Content</div>
      </MentorPaymentsShell>
    )

    expect(screen.getByText('Payments & Earnings')).toBeInTheDocument()
    expect(
      screen.getByText('Connect Stripe to receive payments and track your earnings')
    ).toBeInTheDocument()
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('has correct heading hierarchy', () => {
    render(
      <MentorPaymentsShell>
        <div>Content</div>
      </MentorPaymentsShell>
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Payments & Earnings')
  })

  it('renders children within the shell structure', () => {
    const testContent = 'This is test content for payments'
    render(
      <MentorPaymentsShell>
        <p>{testContent}</p>
      </MentorPaymentsShell>
    )

    expect(screen.getByText(testContent)).toBeInTheDocument()
  })

  it('applies correct container classes', () => {
    const { container } = render(
      <MentorPaymentsShell>
        <div>Content</div>
      </MentorPaymentsShell>
    )

    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('container', 'mx-auto', 'max-w-6xl', 'p-6')
  })
})
