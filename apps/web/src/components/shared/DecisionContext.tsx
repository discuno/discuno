'use client'

import { PencilLine } from 'lucide-react'
import { useState } from 'react'
import { useDecisionQuestion } from '~/hooks/use-decision-question'
import {
  DECISION_QUESTION_MAX_LENGTH,
  DECISION_QUESTION_MIN_LENGTH,
  normalizeDecisionQuestion,
} from '~/lib/decision-context'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'

interface DecisionContextProps {
  emptyTitle?: string
  emptyDescription?: string
  compact?: boolean
  editable?: boolean
}

export function DecisionContext({
  emptyTitle = 'Start with the decision',
  emptyDescription = 'Name the question first, then narrow by the context that matters.',
  compact = false,
  editable = true,
}: DecisionContextProps) {
  const { question, saveQuestion } = useDecisionQuestion()
  const [draft, setDraft] = useState(question)
  const [editing, setEditing] = useState(false)
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [storageUnavailable, setStorageUnavailable] = useState(false)

  const normalizedDraft = normalizeDecisionQuestion(draft)
  const draftIsValid = normalizedDraft.length >= DECISION_QUESTION_MIN_LENGTH
  const showError = attemptedSave && !draftIsValid

  const handleSubmit = () => {
    setAttemptedSave(true)
    setStorageUnavailable(false)
    if (!draftIsValid) return
    if (!saveQuestion(draft)) {
      setStorageUnavailable(true)
      return
    }
    setEditing(false)
    setAttemptedSave(false)
  }

  if (editing) {
    return (
      <div
        role="form"
        aria-labelledby="decision-context-label"
        className="decision-context-enter max-w-3xl"
      >
        <Field data-invalid={showError || storageUnavailable}>
          <FieldLabel id="decision-context-label" htmlFor="decision-context-question">
            What are you trying to decide?
          </FieldLabel>
          <Textarea
            id="decision-context-question"
            name="decisionQuestion"
            value={draft}
            onChange={event => {
              setDraft(event.target.value)
              setStorageUnavailable(false)
            }}
            maxLength={DECISION_QUESTION_MAX_LENGTH}
            rows={3}
            aria-invalid={showError || storageUnavailable}
            aria-describedby={
              showError || storageUnavailable ? 'decision-context-error' : 'decision-context-help'
            }
            autoFocus
          />
          {storageUnavailable ? (
            <FieldError id="decision-context-error">
              This browser blocked session storage. Change its privacy setting or try another
              browser.
            </FieldError>
          ) : showError ? (
            <FieldError id="decision-context-error">
              Write at least {DECISION_QUESTION_MIN_LENGTH} characters.
            </FieldError>
          ) : (
            <FieldDescription id="decision-context-help">
              This stays in this browser session and is not added to the URL.
            </FieldDescription>
          )}
        </Field>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={handleSubmit}>
            Keep this question
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(question)
              setEditing(false)
              setAttemptedSave(false)
              setStorageUnavailable(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="decision-context-enter flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-primary text-sm font-semibold">
          {question ? "You're figuring out" : emptyTitle}
        </p>
        {question ? (
          <p
            className={
              compact
                ? 'font-display mt-1 text-2xl leading-tight font-medium tracking-[-0.025em] sm:text-3xl'
                : 'font-display mt-2 text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-5xl'
            }
          >
            {question}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 max-w-2xl leading-7">{emptyDescription}</p>
        )}
      </div>
      {editable && (
        <Button
          variant="ghost"
          className="shrink-0 self-start sm:self-auto"
          onClick={() => {
            setDraft(question)
            setEditing(true)
          }}
        >
          <PencilLine data-icon="inline-start" />
          {question ? 'Edit question' : 'Add your question'}
        </Button>
      )}
    </div>
  )
}
