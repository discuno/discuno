import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionLayout from './layout'

describe('TransactionLayout', () => {
  it('keeps booking tasks in a quiet shell without marketing navigation or footer', () => {
    render(
      <TransactionLayout>
        <h1>Choose a time</h1>
      </TransactionLayout>
    )

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Discuno home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Choose a time' })
    )
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
