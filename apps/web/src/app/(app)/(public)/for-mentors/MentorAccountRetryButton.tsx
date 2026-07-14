'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { authClient } from '~/lib/auth-client'

export function MentorAccountRetryButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleRetry = async () => {
    setIsLoading(true)

    try {
      const { error } = await authClient.signOut()

      if (error) {
        throw new Error(error.message ?? 'Could not sign out')
      }

      window.location.assign('/auth?intent=mentor')
    } catch (error) {
      console.error('Could not switch accounts:', error)
      toast.error('Could not switch accounts', {
        description:
          'Please sign out from the account menu, then try again with your school email.',
      })
      setIsLoading(false)
    }
  }

  return (
    <Button type="button" className="shrink-0" onClick={handleRetry} disabled={isLoading}>
      {isLoading && <Spinner />}
      Sign out and use school email
    </Button>
  )
}
