'use client'

import { Button } from '~/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { checkVerificationStatus } from '~/app/(default)/email-verification/actions'
import { useState } from 'react'

export const ContinueButton = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    setIsLoading(true)
    try {
      const isVerified = await checkVerificationStatus()

      if (isVerified) {
        router.push('/profile/view')
      } else {
        toast.success('Email Not Verified', {
          description: 'Please check your email and verify your address.',
        })
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      toast.error('Error', {
        description: 'Something went wrong. Please try again later.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button type="button" className="w-full" onClick={handleContinue} disabled={isLoading}>
      {isLoading ? 'Checking...' : 'Continue'}
    </Button>
  )
}
