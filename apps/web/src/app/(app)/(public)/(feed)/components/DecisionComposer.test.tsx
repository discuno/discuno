import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DECISION_CONTEXT_STORAGE_KEY } from '~/lib/decision-context'

const mocks = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

import { DecisionComposer } from './DecisionComposer'

describe('DecisionComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  afterEach(() => vi.restoreAllMocks())

  it('keeps the question in session storage and navigates to a clean discovery URL', async () => {
    const user = userEvent.setup()
    const question = 'Should I switch majors before recruiting starts?'

    render(<DecisionComposer />)

    await user.type(
      screen.getByRole('textbox', { name: 'What are you trying to decide?' }),
      question
    )
    await user.click(screen.getByRole('button', { name: 'Find a mentor' }))

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/find'))
    expect(JSON.parse(window.sessionStorage.getItem(DECISION_CONTEXT_STORAGE_KEY) ?? '{}')).toEqual(
      {
        version: 1,
        question,
      }
    )
  })

  it('keeps an incomplete question on the page', async () => {
    const user = userEvent.setup()

    render(<DecisionComposer />)

    await user.type(screen.getByRole('textbox', { name: 'What are you trying to decide?' }), 'No')
    await user.click(screen.getByRole('button', { name: 'Find a mentor' }))

    expect(screen.getByRole('alert').textContent).toContain('Write at least 3 characters.')
    expect(mocks.push).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(DECISION_CONTEXT_STORAGE_KEY)).toBeNull()
  })

  it('does not navigate when session storage is unavailable', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })

    render(<DecisionComposer />)

    await user.type(
      screen.getByRole('textbox', { name: 'What are you trying to decide?' }),
      'Should I change majors?'
    )
    await user.click(screen.getByRole('button', { name: 'Find a mentor' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/blocked session storage/i)
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
