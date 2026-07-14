'use client'

import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string; statusCode?: number; code?: string }
  reset: () => void
}

interface ErrorStateProps {
  eyebrow: string
  title: string
  description: ReactNode
  primaryLabel: string
  onPrimary: () => void
  primaryIcon?: ReactNode
  onHome: () => void
}

const ErrorState = ({
  eyebrow,
  title,
  description,
  primaryLabel,
  onPrimary,
  primaryIcon,
  onHome,
}: ErrorStateProps) => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border/80 border-b">
        <div className="page-container flex h-16 items-center">
          <Brand />
        </div>
      </header>

      <main className="page-container flex flex-1 items-center py-16 sm:py-24">
        <section className="mx-auto w-full max-w-2xl" aria-labelledby="error-title">
          <div className="border-primary/15 bg-primary/8 text-primary flex size-11 items-center justify-center rounded-lg border">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <p className="eyebrow mt-6">{eyebrow}</p>
          <h1
            id="error-title"
            className="mt-3 text-3xl font-bold tracking-[-0.035em] text-balance sm:text-4xl"
          >
            {title}
          </h1>
          <div className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
            {description}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onPrimary}>
              {primaryIcon}
              {primaryLabel}
            </Button>
            <Button size="lg" variant="outline" onClick={onHome}>
              <ArrowLeft aria-hidden="true" />
              Return home
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

const retryIcon = <RefreshCw aria-hidden="true" />

export default function DefaultError({ error, reset }: ErrorProps) {
  const router = useRouter()
  const goHome = () => router.push('/')

  if (error.name === 'UnauthenticatedError') {
    return (
      <ErrorState
        eyebrow="Sign-in required"
        title="Sign in to continue"
        description="This page is linked to your Discuno account. Sign in to access it securely."
        primaryLabel="Sign in"
        onPrimary={() => router.push('/auth')}
        onHome={goHome}
      />
    )
  }

  if (error.name === 'NotFoundError') {
    return (
      <ErrorState
        eyebrow="Not found"
        title="We couldn’t find that resource"
        description="It may have moved or may no longer be available. Try loading it once more, or return to Discuno."
        primaryLabel="Try again"
        onPrimary={reset}
        primaryIcon={retryIcon}
        onHome={goHome}
      />
    )
  }

  if (error.name === 'UnauthorizedError') {
    return (
      <ErrorState
        eyebrow="Access restricted"
        title="You don’t have access to this page"
        description="Your account does not have permission to view this resource. If your access recently changed, try again."
        primaryLabel="Try again"
        onPrimary={reset}
        primaryIcon={retryIcon}
        onHome={goHome}
      />
    )
  }

  if (error.name === 'BadRequestError') {
    return (
      <ErrorState
        eyebrow="Invalid request"
        title="We couldn’t complete that request"
        description={error.message}
        primaryLabel="Try again"
        onPrimary={reset}
        primaryIcon={retryIcon}
        onHome={goHome}
      />
    )
  }

  if (error.name === 'ExternalApiError') {
    return (
      <ErrorState
        eyebrow="Service unavailable"
        title="A connected service is temporarily unavailable"
        description="Your information is safe. Please wait a moment and try the request again."
        primaryLabel="Try again"
        onPrimary={reset}
        primaryIcon={retryIcon}
        onHome={goHome}
      />
    )
  }

  if (error.name.endsWith('Error') && error.statusCode) {
    const getErrorTitle = (statusCode: number) => {
      switch (statusCode) {
        case 400:
          return 'We couldn’t complete that request'
        case 401:
          return 'Sign in to continue'
        case 403:
          return 'You don’t have access to this page'
        case 404:
          return 'We couldn’t find that resource'
        case 409:
          return 'That change conflicts with existing information'
        case 500:
          return 'Discuno encountered a server error'
        case 502:
          return 'A connected service is temporarily unavailable'
        default:
          return 'We couldn’t complete that request'
      }
    }

    return (
      <ErrorState
        eyebrow={`Error ${error.statusCode}`}
        title={getErrorTitle(error.statusCode)}
        description={error.message}
        primaryLabel="Try again"
        onPrimary={reset}
        primaryIcon={retryIcon}
        onHome={goHome}
      />
    )
  }

  return (
    <ErrorState
      eyebrow="Unexpected error"
      title="Something went wrong"
      description="We couldn’t finish loading this page. Try again, or return home if the problem continues."
      primaryLabel="Try again"
      onPrimary={reset}
      primaryIcon={retryIcon}
      onHome={goHome}
    />
  )
}
