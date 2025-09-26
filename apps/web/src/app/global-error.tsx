'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export const GlobalError = ({ error }: { error: Error }) => {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <h1>Error</h1>
      </body>
    </html>
  )
}

export default GlobalError
