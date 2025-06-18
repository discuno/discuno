import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthShell } from './AuthShell'

describe('AuthShell', () => {
  it('renders static branding immediately', () => {
    render(
      <AuthShell>
        <div data-testid="test-content">Test Content</div>
      </AuthShell>
    )

    expect(screen.getByLabelText('Discuno Icon')).toBeInTheDocument()
    expect(screen.getByLabelText('Discuno Text')).toBeInTheDocument()
    expect(screen.getByText('Connect with college student mentors')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <AuthShell>
        <div data-testid="test-content">Test Content</div>
      </AuthShell>
    )

    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('has proper main styling', () => {
    const { container } = render(
      <AuthShell>
        <div>Content</div>
      </AuthShell>
    )

    const main = container.firstChild as HTMLElement
    expect(main).toHaveClass('bg-background', 'min-h-screen')
  })

  it('renders logo SVGs with correct attributes', () => {
    render(
      <AuthShell>
        <div>Content</div>
      </AuthShell>
    )

    const iconLogo = screen.getByLabelText('Discuno Icon')
    const textLogo = screen.getByLabelText('Discuno Text')

    expect(iconLogo).toBeInTheDocument()
    expect(iconLogo).toHaveAttribute('role', 'img')
    expect(iconLogo).toHaveAttribute('width', '48')
    expect(iconLogo).toHaveAttribute('height', '48')

    expect(textLogo).toBeInTheDocument()
    expect(textLogo).toHaveAttribute('role', 'img')
    expect(textLogo).toHaveAttribute('height', '2rem')
  })

  it('renders SVG logos with correct styling', () => {
    render(
      <AuthShell>
        <div>Content</div>
      </AuthShell>
    )

    const iconLogo = screen.getByLabelText('Discuno Icon')
    const textLogo = screen.getByLabelText('Discuno Text')

    expect(iconLogo).toHaveClass('text-gray-900', 'dark:text-white')
    expect(textLogo).toHaveClass('text-foreground')
  })

  it('renders description with correct styling', () => {
    render(
      <AuthShell>
        <div>Content</div>
      </AuthShell>
    )

    const description = screen.getByText('Connect with college student mentors')
    expect(description).toHaveClass('text-muted-foreground', 'text-lg')
  })

  it('has proper content width styling', () => {
    const { container } = render(
      <AuthShell>
        <div>Content</div>
      </AuthShell>
    )

    const contentWrapper = container.querySelector('.w-full')
    expect(contentWrapper).toBeInTheDocument()
  })
})
