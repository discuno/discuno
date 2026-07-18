import { AlertCircle, ArrowLeft, CalendarDays, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { buttonVariants } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import { cn } from '~/lib/utils'

type ErrorDetails = {
  title: string
  description: string
  action: string
  icon: typeof AlertCircle
  destructive?: boolean
}

function getErrorDetails(searchParams: { type?: string; error?: string }): ErrorDetails {
  if (searchParams.error === 'OAuthAccountNotLinked') {
    return {
      title: 'This email already has an account',
      description:
        'Return to sign-in and choose the Google, Microsoft, or school-email method you used before. If you no longer have access to it, contact support.',
      action: 'Choose another sign-in method',
      icon: Users,
    }
  }

  if (searchParams.error === 'Verification') {
    return {
      title: 'That sign-in code is no longer valid',
      description:
        'Return to sign-in, request a fresh code, and use the newest message in your inbox. Codes expire and can only be used once.',
      action: 'Request a new code',
      icon: RefreshCw,
    }
  }

  if (searchParams.type === 'calcom') {
    return {
      title: 'Your booking setup is not finished yet',
      description:
        'Your profile remains unavailable for bookings until setup succeeds. Try again from mentor settings, then contact support if the problem continues.',
      action: 'Return to mentor sign-in',
      icon: CalendarDays,
      destructive: true,
    }
  }

  return {
    title: 'We could not finish signing you in',
    description:
      'Return to sign-in and use the same method you started with. If the next attempt fails, contact support and name the sign-in method.',
    action: 'Try sign-in again',
    icon: AlertCircle,
    destructive: true,
  }
}

const AuthErrorPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>
}) => {
  const details = getErrorDetails(await searchParams)
  const Icon = details.icon

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Discuno
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12 sm:px-6 sm:py-16">
        <Empty className="w-full py-0 md:py-0" aria-labelledby="auth-error-title">
          <EmptyHeader className="max-w-md gap-3">
            <EmptyMedia
              variant="icon"
              className={
                details.destructive
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-accent text-accent-foreground'
              }
            >
              <Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle
              id="auth-error-title"
              role="heading"
              aria-level={1}
              className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"
            >
              {details.title}
            </EmptyTitle>
            <EmptyDescription className="text-base leading-7">
              {details.description}
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent className="max-w-md">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/auth" className={buttonVariants({ size: 'lg' })}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {details.action}
              </Link>
              <Link
                href="/support"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
              >
                Contact support
              </Link>
            </div>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  )
}

export default AuthErrorPage
