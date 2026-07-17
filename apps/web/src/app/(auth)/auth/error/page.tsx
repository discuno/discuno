import { AlertCircle, ArrowLeft, CalendarDays, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

type ErrorDetails = {
  eyebrow: string
  title: string
  description: string
  nextStep: string
  action: string
  icon: typeof AlertCircle
  destructive?: boolean
}

function getErrorDetails(searchParams: { type?: string; error?: string }): ErrorDetails {
  if (searchParams.error === 'OAuthAccountNotLinked') {
    return {
      eyebrow: 'Sign-in method mismatch',
      title: 'This email already has an account',
      description:
        'It was created with a different sign-in method. Return to sign-in and choose the Google, Microsoft, or school-email option you used before.',
      nextStep:
        'Trying the original method protects your account from being linked to the wrong provider.',
      action: 'Choose another sign-in method',
      icon: Users,
    }
  }

  if (searchParams.error === 'Verification') {
    return {
      eyebrow: 'Code expired',
      title: 'That sign-in code is no longer valid',
      description:
        'School-email codes expire after a short time and can only be used once. Request a fresh code from the sign-in page.',
      nextStep:
        'Use the newest code in your inbox. Older codes stop working when a new one is sent.',
      action: 'Request a new code',
      icon: RefreshCw,
    }
  }

  if (searchParams.type === 'calcom') {
    return {
      eyebrow: 'Mentor setup paused',
      title: 'Your booking setup is not finished yet',
      description:
        'We could not prepare your availability. Your profile will remain unavailable for bookings until setup succeeds.',
      nextStep:
        'Try again from mentor settings. If the problem continues, contact support and your profile will stay protected in the meantime.',
      action: 'Return to mentor sign-in',
      icon: CalendarDays,
      destructive: true,
    }
  }

  return {
    eyebrow: 'Sign-in interrupted',
    title: 'We could not finish signing you in',
    description:
      'This may be a temporary issue. Return to sign-in and use the same method you started with.',
    nextStep:
      'If another attempt fails, contact support and tell us which sign-in method you used.',
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
    <div className="field-notes min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Brand />
        <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm">
          <ArrowLeft aria-hidden="true" />
          Back to Discuno
        </Button>
      </div>

      <main className="mx-auto flex max-w-xl items-center py-14 sm:min-h-[calc(100vh-7rem)] sm:py-20">
        <Card className="stacked-note paper-panel ink-shadow corner-mark w-full">
          <CardHeader className="items-center px-6 pt-8 text-center sm:px-10 sm:pt-10">
            <span
              className={
                details.destructive
                  ? 'bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-md border'
                  : 'bg-accent text-foreground flex size-14 items-center justify-center rounded-md border'
              }
            >
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <Badge variant={details.destructive ? 'destructive' : 'secondary'} className="mt-5">
              {details.eyebrow}
            </Badge>
            <CardTitle className="pt-3 text-2xl leading-8 sm:text-3xl">{details.title}</CardTitle>
            <CardDescription className="max-w-md pt-2 text-base leading-7">
              {details.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 sm:px-10 sm:pb-10">
            <div className="paper-panel bg-accent/25 p-4 text-sm leading-6">
              <p className="font-semibold">What to do next</p>
              <p className="text-muted-foreground mt-1">{details.nextStep}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button render={<Link href="/auth" />} nativeButton={false}>
                <RefreshCw aria-hidden="true" />
                {details.action}
              </Button>
              <Button render={<Link href="/support" />} nativeButton={false} variant="outline">
                Contact support
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default AuthErrorPage
