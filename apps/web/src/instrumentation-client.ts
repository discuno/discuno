import posthog from 'posthog-js'
import { gatePostHogCapture } from '~/lib/analytics/client-consent'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    defaults: '2026-05-30',
    respect_dnt: true,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    before_send: gatePostHogCapture,
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
    },
  })
}
