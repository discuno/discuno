'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { SignInMethods, type AuthAudience } from '~/components/auth/SignInMethods'
import { Brand } from '~/components/shared/Brand'
import { SkipLink } from '~/components/shared/SkipLink'
import { buttonVariants } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { authClient } from '~/lib/auth-client'

type UserType = AuthAudience

export function LoginPage({
  initialUserType = 'mentor',
  reauthenticationRequired = false,
  returnTo,
}: {
  initialUserType?: UserType
  reauthenticationRequired?: boolean
  returnTo?: string
}) {
  const [userType, setUserType] = useState<UserType>(initialUserType)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: returnTo ?? (userType === 'mentor' ? '/settings' : '/find'),
      })
    } catch {
      console.error('OAuth sign-in failed')
      toast.error('Could not sign you in', {
        description: 'Please try again or choose another sign-in method.',
      })
      setIsLoading(null)
    }
  }

  const title = reauthenticationRequired
    ? 'Confirm it’s you'
    : userType === 'mentor'
      ? 'Mentor sign in'
      : 'Sign in to Discuno'
  const description = reauthenticationRequired
    ? 'Sign in again for security. You’ll return to where you left off.'
    : userType === 'mentor'
      ? 'Use a school account to open your mentor workspace.'
      : 'Save your details for later, or continue browsing without an account.'

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <SkipLink href="#auth-content" />
      <header className="border-foreground/15 border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Brand />
          <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft data-icon="inline-start" />
            Back to Discuno
          </Link>
        </div>
      </header>

      <main
        id="auth-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-10 sm:px-6 sm:py-16"
      >
        <section
          className="bg-card border-foreground/20 w-full rounded-xl border p-6 sm:p-8"
          aria-labelledby="auth-title"
        >
          <div className="flex flex-col gap-3">
            <h1 id="auth-title" className="text-3xl leading-tight font-semibold tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-base leading-7">{description}</p>
          </div>

          <Tabs
            value={userType}
            onValueChange={value => setUserType(value as UserType)}
            className="mt-7 w-full"
          >
            <TabsList variant="line" className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="mentor">Mentor</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-7">
              <SignInMethods
                audience="student"
                isLoading={isLoading}
                onOAuthSignIn={handleOAuthSignIn}
              />
            </TabsContent>

            <TabsContent value="mentor" className="mt-7">
              <SignInMethods
                audience="mentor"
                isLoading={isLoading}
                onOAuthSignIn={handleOAuthSignIn}
                returnTo={returnTo}
              />
            </TabsContent>
          </Tabs>

          <p className="text-muted-foreground border-foreground/15 mt-8 border-t pt-5 text-xs leading-5">
            By continuing, you agree to the{' '}
            <Link href="/terms" className="text-foreground underline underline-offset-4">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-foreground underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  )
}
