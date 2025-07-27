import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DashboardShell } from './FeedShell'

describe('DashboardShell', () => {
  it('should render the main content area', () => {
    const searchParams = {}
    render(<DashboardShell searchParams={searchParams} />)

    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
  })
})
