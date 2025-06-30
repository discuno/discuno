'use client'

import * as Sentry from '@sentry/nextjs'
import { AlertCircle, ArrowLeft, Mail, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

interface VerificationErrorProps {
  error: Error & { digest?: string; statusCode?: number; code?: string }
  reset: () => void
}

export default function VerificationError({ error, reset }: VerificationErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log error to Sentry for monitoring
    Sentry.captureException(error, {
      tags: {
        component: 'error-boundary',
        section: 'email-verification',
      },
      extra: {
        digest: error.digest,
        statusCode: error.statusCode,
        code: error.code,
      },
    })

    // Log error for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Email verification error:', error)
    }
  }, [error])

  // Handle token-related errors
  if (error.name === 'BadRequestError' || error.message.includes('token')) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Invalid Verification Link</CardTitle>
            <CardDescription>
              This verification link is invalid or has expired. Please request a new verification
              email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/email-verification')}>
              <Mail className="mr-2 h-4 w-4" />
              Request New Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/auth')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle user not found errors
  if (error.name === 'NotFoundError') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Account Not Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find an account associated with this verification link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/auth')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle generic verification errors
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Verification Failed</CardTitle>
          <CardDescription>
            Something went wrong while verifying your email. Please try again or contact support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/email-verification')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Request New Link
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
