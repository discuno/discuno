import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearDecisionQuestion,
  DECISION_QUESTION_MAX_LENGTH,
  DECISION_CONTEXT_EVENT,
  DECISION_CONTEXT_STORAGE_KEY,
  isValidDecisionQuestion,
  normalizeDecisionQuestion,
  readDecisionQuestion,
  saveDecisionQuestion,
} from './decision-context'

describe('decision context', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('normalizes whitespace without exposing transport concerns', () => {
    expect(normalizeDecisionQuestion('  Should I\n switch   majors?  ')).toBe(
      'Should I switch majors?'
    )
  })

  it('uses the booking question length boundary', () => {
    expect(isValidDecisionQuestion('No')).toBe(false)
    expect(isValidDecisionQuestion('Why')).toBe(true)
    expect(normalizeDecisionQuestion('x'.repeat(DECISION_QUESTION_MAX_LENGTH + 20))).toHaveLength(
      DECISION_QUESTION_MAX_LENGTH
    )
  })

  it('keeps a valid question in versioned session storage and announces local changes', () => {
    const listener = vi.fn()
    window.addEventListener(DECISION_CONTEXT_EVENT, listener)

    expect(saveDecisionQuestion('  Should I switch majors? ')).toBe(true)
    expect(window.localStorage.getItem(DECISION_CONTEXT_STORAGE_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(DECISION_CONTEXT_STORAGE_KEY)).toBe(
      JSON.stringify({ version: 1, question: 'Should I switch majors?' })
    )
    expect(readDecisionQuestion()).toBe('Should I switch majors?')
    expect(listener).toHaveBeenCalledOnce()

    window.removeEventListener(DECISION_CONTEXT_EVENT, listener)
  })

  it('rejects invalid storage and clears only the session value', () => {
    window.sessionStorage.setItem(DECISION_CONTEXT_STORAGE_KEY, '{not-json')
    expect(readDecisionQuestion()).toBe('')
    expect(saveDecisionQuestion('No')).toBe(false)

    window.sessionStorage.setItem(
      DECISION_CONTEXT_STORAGE_KEY,
      JSON.stringify({ version: 1, question: 'Should I transfer?' })
    )
    clearDecisionQuestion()
    expect(readDecisionQuestion()).toBe('')
  })

  it('fails closed when the browser denies session-storage writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError')
    })

    expect(saveDecisionQuestion('Should I change majors?')).toBe(false)
    expect(readDecisionQuestion()).toBe('')
  })
})
