import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AvailabilityShell } from './AvailabilityShell'

// Mock the loading spinner
vi.mock('~/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('AvailabilityShell', () => {
  it('renders static header immediately', () => {
    render(
      <AvailabilityShell>
        <div data-testid="test-content">Test Content</div>
      </AvailabilityShell>
    )

    expect(screen.getByText('Availability Settings')).toBeInTheDocument()
    expect(
      screen.getByText('Configure when students can book mentoring sessions with you')
    ).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <AvailabilityShell>
        <div data-testid="test-content">Test Content</div>
      </AvailabilityShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(
      <AvailabilityShell>
        <div>Content</div>
      </AvailabilityShell>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('container', 'mx-auto', 'max-w-6xl', 'p-6')
  })

  it('renders header with correct styling', () => {
    render(
      <AvailabilityShell>
        <div>Content</div>
      </AvailabilityShell>
    )

    const title = screen.getByText('Availability Settings')
    const description = screen.getByText(
      'Configure when students can book mentoring sessions with you'
    )

    expect(title).toHaveClass('text-foreground', 'text-4xl', 'font-bold')
    expect(description).toHaveClass('text-muted-foreground', 'mt-2')
  })

  it('has proper header spacing', () => {
    const { container } = render(
      <AvailabilityShell>
        <div>Content</div>
      </AvailabilityShell>
    )

    const header = container.querySelector('.mb-8')
    expect(header).toBeInTheDocument()
  })
})
