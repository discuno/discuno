import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MentorShell } from './MentorShell'

// Mock the loading spinner
vi.mock('~/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('MentorShell', () => {
  it('renders static header immediately', () => {
    const title = 'Mentor Dashboard'
    const description = 'Manage your mentoring activities'

    render(
      <MentorShell title={title} description={description}>
        <div data-testid="test-content">Test Content</div>
      </MentorShell>
    )

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <MentorShell title="Title" description="Description">
        <div data-testid="test-content">Test Content</div>
      </MentorShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(
      <MentorShell title="Title" description="Description">
        <div>Content</div>
      </MentorShell>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('container', 'mx-auto', 'max-w-6xl', 'p-6')
  })

  it('renders header with correct styling', () => {
    render(
      <MentorShell title="My Title" description="My Description">
        <div>Content</div>
      </MentorShell>
    )

    const title = screen.getByText('My Title')
    const description = screen.getByText('My Description')

    expect(title).toHaveClass('text-foreground', 'text-4xl', 'font-bold')
    expect(description).toHaveClass('text-muted-foreground', 'mt-2')
  })

  it('has proper header spacing', () => {
    const { container } = render(
      <MentorShell title="Title" description="Description">
        <div>Content</div>
      </MentorShell>
    )

    const header = container.querySelector('.mb-8')
    expect(header).toBeInTheDocument()
  })
})
