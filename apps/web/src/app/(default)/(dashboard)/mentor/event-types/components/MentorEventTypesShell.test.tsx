import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MentorEventTypesShell } from './MentorEventTypesShell'

describe('MentorEventTypesShell', () => {
  it('renders static header immediately', () => {
    render(
      <MentorEventTypesShell>
        <div data-testid="test-content">Test Content</div>
      </MentorEventTypesShell>
    )

    expect(screen.getByText('Event Types')).toBeInTheDocument()
    expect(
      screen.getByText('Create and manage different types of mentoring sessions')
    ).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <MentorEventTypesShell>
        <div data-testid="test-content">Test Content</div>
      </MentorEventTypesShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(
      <MentorEventTypesShell>
        <div>Content</div>
      </MentorEventTypesShell>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('container', 'mx-auto', 'max-w-6xl', 'p-6')
  })

  it('renders header with correct styling', () => {
    render(
      <MentorEventTypesShell>
        <div>Content</div>
      </MentorEventTypesShell>
    )

    const title = screen.getByText('Event Types')
    const description = screen.getByText('Create and manage different types of mentoring sessions')

    expect(title).toHaveClass('text-foreground', 'text-4xl', 'font-bold')
    expect(description).toHaveClass('text-muted-foreground', 'mt-2')
  })

  it('has proper header spacing', () => {
    const { container } = render(
      <MentorEventTypesShell>
        <div>Content</div>
      </MentorEventTypesShell>
    )

    const header = container.querySelector('.mb-8')
    expect(header).toBeInTheDocument()
  })
})
