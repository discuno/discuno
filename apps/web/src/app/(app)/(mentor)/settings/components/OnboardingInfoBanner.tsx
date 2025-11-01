'use client'

import { Info, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'

interface OnboardingInfoBannerProps {
  title: string
  description: string
  tips?: string[]
  storageKey: string
}

export const OnboardingInfoBanner = ({
  title,
  description,
  tips,
  storageKey,
}: OnboardingInfoBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) === 'true'
    }
    return false
  })

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true')
    }
  }

  if (isDismissed) {
    return null
  }

  return (
    <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AlertTitle className="text-blue-900 dark:text-blue-100">{title}</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p>{description}</p>
            {tips && tips.length > 0 && (
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {tips.map((tip, index) => (
                  <li key={index} className="text-sm">
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  )
}
