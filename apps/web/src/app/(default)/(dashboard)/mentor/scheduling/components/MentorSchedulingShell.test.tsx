import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MentorSchedulingShell } from './MentorSchedulingShell'

describe('MentorSchedulingShell', () => {
  it('renders static header immediately', () => {
    render(
      <MentorSchedulingShell>
        <div data-testid="test-content">Test Content</div>
      </MentorSchedulingShell>
    )

    expect(screen.getByText('Scheduling Center')).toBeInTheDocument()
    expect(
      screen.getByText('Set your availability and create mentoring session types')
    ).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <MentorSchedulingShell>
        <div data-testid="test-content">Test Content</div>
      </MentorSchedulingShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(
      <MentorSchedulingShell>
        <div>Content</div>
      </MentorSchedulingShell>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('container', 'mx-auto', 'max-w-6xl', 'p-6')
  })

  it('renders header with correct styling', () => {
    render(
      <MentorSchedulingShell>
        <div>Content</div>
      </MentorSchedulingShell>
    )

    const title = screen.getByText('Scheduling Center')
    const description = screen.getByText('Set your availability and create mentoring session types')

    expect(title).toHaveClass('text-foreground', 'text-4xl', 'font-bold')
    expect(description).toHaveClass('text-muted-foreground', 'mt-2')
  })

  it('has proper header spacing', () => {
    const { container } = render(
      <MentorSchedulingShell>
        <div>Content</div>
      </MentorSchedulingShell>
    )

    const header = container.querySelector('.mb-8')
    expect(header).toBeInTheDocument()
  })
})
