'use client'

import { useEffect } from 'react'

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-2xl font-bold">Sign In Successful</h1>
      <p className="text-muted-foreground mt-2">
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
    </div>
  )
}
