import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfileShell } from './ProfileShell'

// Mock the loading spinner
vi.mock('~/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('ProfileShell', () => {
  it('renders static header immediately', () => {
    const title = 'Test Profile'
    const description = 'Test description'

    render(
      <ProfileShell title={title} description={description}>
        <div data-testid="test-content">Test Content</div>
      </ProfileShell>
    )

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <ProfileShell title="Title" description="Description">
        <div data-testid="test-content">Test Content</div>
      </ProfileShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(
      <ProfileShell title="Title" description="Description">
        <div>Content</div>
      </ProfileShell>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('container', 'mx-auto', 'max-w-4xl', 'p-6')
  })

  it('renders header with correct styling', () => {
    render(
      <ProfileShell title="My Title" description="My Description">
        <div>Content</div>
      </ProfileShell>
    )

    const title = screen.getByText('My Title')
    const description = screen.getByText('My Description')

    expect(title).toHaveClass('text-foreground', 'text-3xl', 'font-bold')
    expect(description).toHaveClass('text-muted-foreground', 'mt-2')
  })

  it('has proper header spacing', () => {
    const { container } = render(
      <ProfileShell title="Title" description="Description">
        <div>Content</div>
      </ProfileShell>
    )

    const header = container.querySelector('.mb-8')
    expect(header).toBeInTheDocument()
  })
})
