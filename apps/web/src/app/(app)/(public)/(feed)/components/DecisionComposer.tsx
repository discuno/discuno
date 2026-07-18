'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'
import { Textarea } from '~/components/ui/textarea'
import { useDecisionQuestion } from '~/hooks/use-decision-question'
import {
  DECISION_QUESTION_MAX_LENGTH,
  DECISION_QUESTION_MIN_LENGTH,
  normalizeDecisionQuestion,
} from '~/lib/decision-context'

export function DecisionComposer() {
  const router = useRouter()
  const { question, saveQuestion } = useDecisionQuestion()
  const [draft, setDraft] = useState<string | null>(null)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [isNavigating, startNavigation] = useTransition()

  const currentDraft = draft ?? question
  const normalizedDraft = normalizeDecisionQuestion(currentDraft)
  const showError = attemptedSubmit && normalizedDraft.length < DECISION_QUESTION_MIN_LENGTH

  const handleSubmit = () => {
    setAttemptedSubmit(true)
    setStorageUnavailable(false)

    if (normalizedDraft.length < DECISION_QUESTION_MIN_LENGTH) return
    if (!saveQuestion(currentDraft)) {
      setStorageUnavailable(true)
      return
    }

    startNavigation(() => router.push('/find'))
  }

  return (
    <div
      id="decision-composer"
      role="form"
      aria-labelledby="home-decision-label"
      className="border-foreground/20 mt-8 scroll-mt-24 border-y py-5"
    >
      <Field data-invalid={showError || storageUnavailable}>
        <FieldLabel id="home-decision-label" htmlFor="home-decision-question" className="text-base">
          What are you trying to decide?
        </FieldLabel>
        <Textarea
          id="home-decision-question"
          name="decisionQuestion"
          value={currentDraft}
          onChange={event => {
            setDraft(event.target.value)
            setStorageUnavailable(false)
          }}
          maxLength={DECISION_QUESTION_MAX_LENGTH}
          rows={3}
          placeholder="Should I switch majors before recruiting starts?"
          aria-invalid={showError || storageUnavailable}
          aria-describedby={
            showError || storageUnavailable ? 'home-decision-error' : 'home-decision-help'
          }
        />
        {storageUnavailable ? (
          <FieldError id="home-decision-error">
            This browser blocked session storage. Change its privacy setting or try another browser.
          </FieldError>
        ) : showError ? (
          <FieldError id="home-decision-error">
            Write at least {DECISION_QUESTION_MIN_LENGTH} characters.
          </FieldError>
        ) : (
          <FieldDescription id="home-decision-help">
            Saved for this browser session only. Your question never goes in the URL.
          </FieldDescription>
        )}
      </Field>

      <Button
        type="button"
        size="lg"
        className="mt-5"
        disabled={isNavigating}
        aria-busy={isNavigating}
        onClick={handleSubmit}
      >
        {isNavigating ? 'Finding mentors' : 'Find a mentor'}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  )
}
