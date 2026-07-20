'use client'

import { useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import {
  getClientAnalyticsConsentSnapshot,
  getServerAnalyticsConsentSnapshot,
  subscribeToClientAnalyticsConsent,
} from '~/lib/analytics/client-consent'
import { applyClientAnalyticsPreference } from '~/lib/analytics/client-posthog'
import { persistAnalyticsPreference } from '~/lib/analytics/preferences-client'

export const AnalyticsPrivacyControls = () => {
  const [isSaving, setIsSaving] = useState(false)
  const analyticsConsentState = useSyncExternalStore(
    subscribeToClientAnalyticsConsent,
    getClientAnalyticsConsentSnapshot,
    getServerAnalyticsConsentSnapshot
  )
  const analyticsEnabled = analyticsConsentState === 'enabled'

  const updateAnalyticsPreference = (enabled: boolean) => {
    applyClientAnalyticsPreference(enabled)
    setIsSaving(true)

    void persistAnalyticsPreference(enabled)
      .then(result => {
        if (result === 'failed') {
          toast.error('This browser was updated, but we could not save the choice across devices.')
        }
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <div className="border-border bg-muted/40 flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="analytics-cookies">Optional analytics</Label>
        <p className="text-muted-foreground text-sm">
          Help us understand which parts of Discuno are useful. Essential authentication and
          security cookies are unaffected. We save this choice to your current account or temporary
          session when available; otherwise it stays in this browser. When Do Not Track is enabled,
          analytics stays off unless you deliberately turn it on here.
        </p>
      </div>
      <Switch
        id="analytics-cookies"
        checked={analyticsEnabled}
        onCheckedChange={updateAnalyticsPreference}
        disabled={analyticsConsentState === 'pending' || isSaving}
        aria-label="Allow optional analytics"
      />
    </div>
  )
}
