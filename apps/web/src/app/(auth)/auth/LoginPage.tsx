'use client'

import {
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  Compass,
  GraduationCap,
  Mail,
  MessageSquareText,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmailSignInForm } from '~/app/(auth)/auth/EmailSignInForm'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { authClient } from '~/lib/auth-client'

type UserType = 'student' | 'mentor'

const mentorReasons = [
  {
    icon: MessageSquareText,
    title: 'Help with a real decision',
    description: 'Share the context you wish someone had given you at the same moment.',
  },
  {
    icon: CalendarClock,
    title: 'Mentor around your schedule',
    description: 'Open only the times that work around classes, work, and life.',
  },
  {
    icon: CircleDollarSign,
    title: 'Give back or set a price',
    description: 'Offer free conversations, paid sessions, or a mix of both.',
  },
]

const studentReasons = [
  {
    icon: Compass,
    title: 'Start with the decision',
    description: 'A course, a major, an internship, or whatever keeps circling in your head.',
  },
  {
    icon: MessageSquareText,
    title: "Talk to someone who's lived it",
    description: 'Find relevant firsthand context instead of another generic playbook.',
  },
  {
    icon: GraduationCap,
    title: 'Choose your next move',
    description: 'Use the conversation to ask better questions and decide what comes next.',
  },
]

export function LoginPage({ initialUserType = 'mentor' }: { initialUserType?: UserType }) {
  const [userType, setUserType] = useState<UserType>(initialUserType)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const reasons = userType === 'mentor' ? mentorReasons : studentReasons

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: userType === 'mentor' ? '/settings' : '/#mentors',
      })
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Could not sign you in', {
        description: 'Please try again or choose another sign-in method.',
      })
      setIsLoading(null)
    }
  }

  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#10254a] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <Brand className="text-white" />

        <div className="my-auto max-w-xl py-14">
          <p className="text-sm font-semibold tracking-[0.14em] text-blue-200 uppercase">
            {userType === 'mentor' ? 'Share your experience' : 'Find firsthand perspective'}
          </p>
          <h2 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-balance xl:text-5xl">
            {userType === 'mentor'
              ? 'Be the student you wish you could have asked.'
              : 'A clearer next move starts with the right conversation.'}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/80">
            {userType === 'mentor'
              ? 'Give practical, firsthand context to someone navigating a choice you already know.'
              : 'Talk through the question a search result cannot answer for your situation.'}
          </p>

          <div className="mt-10 space-y-6">
            {reasons.map(reason => (
              <div key={reason.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <reason.icon className="h-5 w-5 text-blue-100" />
                </div>
                <div>
                  <h3 className="font-semibold">{reason.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-100/65">{reason.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs leading-5 text-blue-100/60">
          {userType === 'mentor'
            ? 'Mentor access requires a supported .edu address. Finish your profile only when you are ready.'
            : 'You can browse and book without an account. Sign in only if you want your details remembered.'}
        </p>
      </section>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
        <div className="flex items-center justify-between">
          <Brand className="lg:hidden" />
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link href="/">
              <ArrowLeft />
              Back to Discuno
            </Link>
          </Button>
        </div>

        <div className="my-auto w-full max-w-md self-center py-12">
          <Tabs
            value={userType}
            onValueChange={value => setUserType(value as UserType)}
            className="w-full"
          >
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg">
              <TabsTrigger value="mentor">Share experience</TabsTrigger>
              <TabsTrigger value="student">Find guidance</TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <p className="eyebrow">
                {userType === 'mentor' ? 'Start mentoring' : 'Optional account'}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {userType === 'mentor' ? 'Share what you have learned' : 'Keep your details handy'}
              </h1>
              <p className="text-muted-foreground mt-3 leading-7">
                {userType === 'mentor'
                  ? 'New and returning mentors use the same sign-in. A supported school email opens mentor access.'
                  : 'Browsing and booking are available without an account. Sign in only if you want your details prefilled.'}
              </p>

              {userType === 'mentor' && (
                <div className="mt-5 grid gap-2.5 lg:hidden">
                  {mentorReasons.map(benefit => (
                    <div
                      key={benefit.title}
                      className="text-foreground flex items-center gap-3 text-sm font-medium"
                    >
                      <span className="bg-secondary text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                        <benefit.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {benefit.title}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <TabsContent value="mentor" className="mt-7 space-y-4">
              <div className="border-border bg-muted/35 rounded-xl border p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Mail className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Use your school email</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
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

              <p className="text-muted-foreground flex items-start gap-2 text-xs leading-5">
                <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Choose an account ending in .edu. Personal Google or Microsoft accounts receive
                regular browsing access. If your school is not supported, contact support for
                review.
              </p>
            </TabsContent>

            <TabsContent value="student" className="mt-7 space-y-4">
              <ProviderButtons isLoading={isLoading} onSignIn={handleOAuthSignIn} />
            </TabsContent>
          </Tabs>

          <p className="text-muted-foreground mt-7 text-center text-xs leading-5">
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
        </div>
      </main>
    </div>
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
