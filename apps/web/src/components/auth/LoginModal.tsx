'use client'

import { BriefcaseBusiness, GraduationCap, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmailSignInForm } from '~/app/(auth)/auth/EmailSignInForm'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Spinner } from '~/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { authClient } from '~/lib/auth-client'

type UserType = 'student' | 'mentor'

export function LoginModal({
  isOpen,
  onOpenChange,
  mode = 'signin',
  defaultUserType = 'student',
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'signin' | 'signup'
  defaultUserType?: UserType
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <LoginModalContent
        key={`${isOpen ? 'open' : 'closed'}:${defaultUserType}`}
        mode={mode}
        defaultUserType={defaultUserType}
      />
    </Dialog>
  )
}

function LoginModalContent({
  mode,
  defaultUserType,
}: {
  mode: 'signin' | 'signup'
  defaultUserType: UserType
}) {
  const [userType, setUserType] = useState<UserType>(defaultUserType)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: userType === 'mentor' ? '/settings' : window.location.href,
      })
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Could not sign you in', {
        description: 'Please try again or choose another sign-in method.',
      })
      setIsLoading(null)
    }
  }

  const title =
    mode === 'signin'
      ? 'Welcome back'
      : userType === 'mentor'
        ? 'Start mentoring on Discuno'
        : 'Create your Discuno account'

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[440px]">
      <DialogHeader className="items-center text-center">
        <Brand compact className="mb-3" />
        <DialogTitle className="text-2xl tracking-[-0.025em]">{title}</DialogTitle>
        <DialogDescription className="max-w-sm leading-relaxed">
          {userType === 'mentor'
            ? 'Use your school email to create your mentor profile and set up availability.'
            : 'Sign in to prefill your details when you book. Browsing does not require an account.'}
        </DialogDescription>
      </DialogHeader>

      <Tabs
        value={userType}
        onValueChange={value => setUserType(value as UserType)}
        className="mt-2 w-full"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg">
          <TabsTrigger value="student" className="gap-2 rounded-md">
            <GraduationCap />
            Mentee
          </TabsTrigger>
          <TabsTrigger value="mentor" className="gap-2 rounded-md">
            <BriefcaseBusiness />
            Mentor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="mt-5 space-y-3">
          <ProviderButtons isLoading={isLoading} onSignIn={handleOAuthSignIn} />
          <p className="text-muted-foreground flex items-start gap-2 pt-1 text-xs leading-relaxed">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            You can choose a mentor and see availability before signing in.
          </p>
        </TabsContent>

        <TabsContent value="mentor" className="mt-5 space-y-4">
          <div className="border-border bg-muted/35 rounded-xl border p-4">
            <div className="mb-4 flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Mail className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Use your school email</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Recommended. We will send a one-time code to your supported .edu address.
                </p>
              </div>
            </div>
            <EmailSignInForm />
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background text-muted-foreground px-3">
                or use a school-managed account
              </span>
            </div>
          </div>

          <ProviderButtons isLoading={isLoading} onSignIn={handleOAuthSignIn} schoolAccount />

          <p className="text-muted-foreground text-xs leading-relaxed">
            Choose the Google or Microsoft account whose address ends in .edu. A personal account
            signs you in as a mentee and will not open mentor settings.
          </p>
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground mt-1 text-center text-xs leading-relaxed">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="text-foreground underline underline-offset-4">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-foreground underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </DialogContent>
  )
}

function ProviderButtons({
  isLoading,
  onSignIn,
  schoolAccount = false,
}: {
  isLoading: string | null
  onSignIn: (provider: 'google' | 'microsoft') => Promise<void>
  schoolAccount?: boolean
}) {
  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        className="h-11 w-full font-medium"
        onClick={() => onSignIn('google')}
        disabled={!!isLoading}
      >
        {isLoading === 'google' ? <Spinner /> : <GoogleIcon />}
        Continue with {schoolAccount ? 'Google school account' : 'Google'}
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full font-medium"
        onClick={() => onSignIn('microsoft')}
        disabled={!!isLoading}
      >
        {isLoading === 'microsoft' ? <Spinner /> : <MicrosoftIcon />}
        Continue with {schoolAccount ? 'Microsoft school account' : 'Microsoft'}
      </Button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.24 1.06-3.72 1.06a6.44 6.44 0 0 1-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.08H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.57 10.57 0 0 0 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84A6.44 6.44 0 0 1 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" className="h-4 w-4" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}
