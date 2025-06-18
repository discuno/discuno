import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComponentsShowcaseShell } from './ComponentsShowcaseShell'

describe('ComponentsShowcaseShell', () => {
  it('renders static header immediately', () => {
    render(
      <ComponentsShowcaseShell>
        <div data-testid="test-content">Test Content</div>
      </ComponentsShowcaseShell>
    )

    expect(screen.getByText('@discuno/atoms')).toBeInTheDocument()
    expect(
      screen.getByText(
        'A modern, hydration-safe replacement for @calcom/atoms. Built with Next.js 15, TypeScript, and zero hydration issues.'
      )
    ).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <ComponentsShowcaseShell>
        <div data-testid="test-content">Test Content</div>
      </ComponentsShowcaseShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper container styling', () => {
    const { container } = render(
      <ComponentsShowcaseShell>
        <div>Content</div>
      </ComponentsShowcaseShell>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass(
      'from-background',
      'via-background',
      'to-accent/5',
      'min-h-screen',
      'bg-gradient-to-br'
    )
  })

  it('renders feature badges', () => {
    render(
      <ComponentsShowcaseShell>
        <div>Content</div>
      </ComponentsShowcaseShell>
    )

    expect(screen.getByText('Zero Hydration Issues')).toBeInTheDocument()
    expect(screen.getByText('TypeScript First')).toBeInTheDocument()
    expect(screen.getByText('React Query')).toBeInTheDocument()
  })

  it('has proper header styling', () => {
    render(
      <ComponentsShowcaseShell>
        <div>Content</div>
      </ComponentsShowcaseShell>
    )

    const title = screen.getByText('@discuno/atoms')
    expect(title).toHaveClass(
      'from-primary',
      'to-accent',
      'bg-gradient-to-r',
      'bg-clip-text',
      'text-5xl',
      'font-bold',
      'text-transparent'
    )
  })

  it('has proper spacing', () => {
    const { container } = render(
      <ComponentsShowcaseShell>
        <div>Content</div>
      </ComponentsShowcaseShell>
    )

    const heroSection = container.querySelector('.mb-12')
    expect(heroSection).toBeInTheDocument()
  })
})
