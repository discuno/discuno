'use client'

import { useEffect } from 'react'
import { Spinner } from '~/components/ui/spinner'

export default function OAuthSuccessPage() {
  useEffect(() => {
    if (window.opener) {
      // Send success message to parent window
      window.opener.postMessage('oauth-success', window.location.origin)
    } else {
      // Fallback if not opened in popup (e.g. mobile or user navigation)
      window.location.href = '/'
    }
  }, [])

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Spinner className="text-primary mb-5 size-5" />
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re signed in</h1>
      <p className="text-muted-foreground mt-2 max-w-sm leading-6">
        You can now close this window and continue your booking.
      </p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Immediate execution for faster response
            if (window.opener) {
              window.opener.postMessage('oauth-success', window.location.origin);
              window.close();
            }
          `,
        }}
      />
    </main>
  )
}
