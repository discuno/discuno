import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardShell } from './FeedShell'

// Mock the dynamic content component
vi.mock('./DashboardContent', () => ({
  DashboardContent: ({
    searchParams,
  }: {
    searchParams: { school?: string; major?: string; gradYear?: string }
  }) => <div data-testid="dashboard-content">Filters: {JSON.stringify(searchParams)}</div>,
}))

// Mock the loading spinner
vi.mock('~/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}))

describe('DashboardShell', () => {
  it('renders static layout immediately', () => {
    render(<DashboardShell searchParams={{}} />)

    const main = screen.getByRole('main')
    expect(main).toHaveClass('text-foreground', 'min-h-screen', 'pt-16')
  })

  it('passes search params to content component', () => {
    const searchParams = { school: 'MIT', major: 'CS', gradYear: '2025' }
    render(<DashboardShell searchParams={searchParams} />)

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
    expect(screen.getByText(`Filters: ${JSON.stringify(searchParams)}`)).toBeInTheDocument()
  })

  it('handles empty search params', () => {
    render(<DashboardShell searchParams={{}} />)

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
    expect(screen.getByText('Filters: {}')).toBeInTheDocument()
  })

  it('has proper wrapper structure', () => {
    const { container } = render(<DashboardShell searchParams={{}} />)

    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()

    const wrapper = main?.querySelector('.relative')
    expect(wrapper).toBeInTheDocument()
  })
})
