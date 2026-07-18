'use client'

import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'

interface ErrorProps {
  error: Error & { digest?: string; statusCode?: number; code?: string }
  reset: () => void
}

interface ErrorStateProps {
  title: string
  description: ReactNode
  primaryLabel: string
  onPrimary: () => void
  primaryIcon?: ReactNode
  onHome: () => void
}

const ErrorState = ({
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
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12 sm:px-6 sm:py-16">
        <Empty className="w-full py-0 md:py-0" aria-labelledby="error-title" role="alert">
          <EmptyHeader className="max-w-md gap-3">
            <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
              <AlertCircle aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle
              id="error-title"
              role="heading"
              aria-level={1}
              className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"
            >
              {title}
            </EmptyTitle>
            <EmptyDescription className="text-base leading-7">{description}</EmptyDescription>
          </EmptyHeader>

          <EmptyContent className="max-w-md">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button size="lg" onClick={onPrimary}>
                {primaryIcon}
                {primaryLabel}
              </Button>
              <Button size="lg" variant="outline" onClick={onHome}>
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Return home
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  )
}

const retryIcon = <RefreshCw data-icon="inline-start" aria-hidden="true" />

export default function DefaultError({ error, reset }: ErrorProps) {
  const router = useRouter()
  const goHome = () => router.push('/')

  if (error.name === 'UnauthenticatedError') {
    return (
      <ErrorState
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
        title="A connected service is temporarily unavailable"
        description="The connected service did not complete the request. Wait a moment and try again."
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
      title="Something went wrong"
      description="We couldn’t finish loading this page. Try again, or return home if the problem continues."
      primaryLabel="Try again"
      onPrimary={reset}
      primaryIcon={retryIcon}
      onHome={goHome}
    />
  )
}
