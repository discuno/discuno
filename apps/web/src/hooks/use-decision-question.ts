'use client'

import { useSyncExternalStore } from 'react'
import {
  readDecisionQuestion,
  saveDecisionQuestion,
  subscribeToDecisionQuestion,
} from '~/lib/decision-context'

const getServerSnapshot = () => ''

export function useDecisionQuestion() {
  const question = useSyncExternalStore(
    subscribeToDecisionQuestion,
    readDecisionQuestion,
    getServerSnapshot
  )

  return {
    question,
    saveQuestion: saveDecisionQuestion,
  }
}
