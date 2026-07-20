export const DECISION_CONTEXT_STORAGE_KEY = 'discuno:decision-context:v1'
export const DECISION_CONTEXT_EVENT = 'discuno:decision-context-change'
export const DECISION_QUESTION_MIN_LENGTH = 3
export const DECISION_QUESTION_MAX_LENGTH = 200

interface StoredDecisionContext {
  version: 1
  question: string
}

export function normalizeDecisionQuestion(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, DECISION_QUESTION_MAX_LENGTH)
}

export function isValidDecisionQuestion(value: string) {
  const question = normalizeDecisionQuestion(value)
  return (
    question.length >= DECISION_QUESTION_MIN_LENGTH &&
    question.length <= DECISION_QUESTION_MAX_LENGTH
  )
}

export function readDecisionQuestion() {
  if (typeof window === 'undefined') return ''

  try {
    const storedValue = window.sessionStorage.getItem(DECISION_CONTEXT_STORAGE_KEY)
    if (!storedValue) return ''

    const stored = JSON.parse(storedValue) as Partial<StoredDecisionContext>
    if (stored.version !== 1 || typeof stored.question !== 'string') return ''

    const question = normalizeDecisionQuestion(stored.question)
    return isValidDecisionQuestion(question) ? question : ''
  } catch {
    return ''
  }
}

export function saveDecisionQuestion(value: string) {
  if (typeof window === 'undefined') return false

  const question = normalizeDecisionQuestion(value)
  if (!isValidDecisionQuestion(question)) return false

  try {
    const stored: StoredDecisionContext = { version: 1, question }
    window.sessionStorage.setItem(DECISION_CONTEXT_STORAGE_KEY, JSON.stringify(stored))
    window.dispatchEvent(new Event(DECISION_CONTEXT_EVENT))
    return true
  } catch {
    return false
  }
}

export function clearDecisionQuestion() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(DECISION_CONTEXT_STORAGE_KEY)
    window.dispatchEvent(new Event(DECISION_CONTEXT_EVENT))
  } catch {
    // Storage can be unavailable in restricted browser contexts. There is no
    // persisted value to clear when the browser denies access.
  }
}

export function subscribeToDecisionQuestion(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined

  window.addEventListener(DECISION_CONTEXT_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)

  return () => {
    window.removeEventListener(DECISION_CONTEXT_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}
