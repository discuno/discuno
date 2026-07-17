'use client'

import {
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
  Compass,
  GraduationCap,
  MessageSquareText,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { SignInMethods, type AuthAudience } from '~/components/auth/SignInMethods'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { authClient } from '~/lib/auth-client'

type UserType = AuthAudience

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
  const reasons = userType === 'mentor' ? mentorReasons : studentReasons

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: returnTo ?? (userType === 'mentor' ? '/settings' : '/#mentors'),
      })
    } catch {
      console.error('OAuth sign-in failed')
      toast.error('Could not sign you in', {
        description: 'Please try again or choose another sign-in method.',
      })
      setIsLoading(null)
    }
  }

  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="field-notes-ink on-ink relative hidden overflow-hidden px-10 py-10 lg:flex lg:flex-col xl:px-16 xl:py-12">
        <Brand className="text-background" />

        <div className="my-auto max-w-xl py-14">
          <p className="note-stamp">
            {userType === 'mentor' ? 'Share your experience' : 'Find firsthand perspective'}
          </p>
          <h2 className="mt-7 text-5xl leading-[0.96] font-semibold tracking-[-0.045em] text-balance xl:text-6xl">
            {userType === 'mentor'
              ? 'Be the student you wish you could have asked.'
              : 'A clearer next move starts with the right conversation.'}
          </h2>
          <p className="text-background/70 mt-5 max-w-lg text-base leading-7">
            {userType === 'mentor'
              ? 'Give practical, firsthand context to someone navigating a choice you already know.'
              : 'Talk through the question a search result cannot answer for your situation.'}
          </p>

          <div className="mt-10 space-y-6">
            {reasons.map(reason => (
              <div key={reason.title} className="flex gap-4">
                <div className="bg-highlight text-highlight-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15">
                  <reason.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{reason.title}</h3>
                  <p className="text-background/60 mt-1 text-sm leading-6">{reason.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-background/55 text-xs leading-5">
          {userType === 'mentor'
            ? 'Mentor access requires a supported .edu address. Finish your profile only when you are ready.'
            : 'You can browse and book without an account. Sign in only if you want your details remembered.'}
        </p>
      </section>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
        <div className="flex items-center justify-between">
          <Brand className="lg:hidden" />
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <ArrowLeft />
            Back to Discuno
          </Button>
        </div>

        <div className="my-auto w-full max-w-md self-center py-12">
          <Tabs
            value={userType}
            onValueChange={value => setUserType(value as UserType)}
            className="w-full"
          >
            <TabsList variant="line" className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="mentor">Share experience</TabsTrigger>
              <TabsTrigger value="student">Find guidance</TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <p className="eyebrow">
                {reauthenticationRequired
                  ? 'Confirm it’s you'
                  : userType === 'mentor'
                    ? 'Start mentoring'
                    : 'Optional account'}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {reauthenticationRequired
                  ? 'Sign in again to continue'
                  : userType === 'mentor'
                    ? 'Share what you have learned'
                    : 'Keep your details handy'}
              </h1>
              <p className="text-muted-foreground mt-3 leading-7">
                {reauthenticationRequired
                  ? 'This extra check protects changes to your calendar and payout details. You will return to where you left off.'
                  : userType === 'mentor'
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

            <TabsContent value="mentor" className="mt-7">
              <SignInMethods
                audience="mentor"
                isLoading={isLoading}
                onOAuthSignIn={handleOAuthSignIn}
                returnTo={returnTo}
              />
            </TabsContent>

            <TabsContent value="student" className="mt-7">
              <SignInMethods
                audience="student"
                isLoading={isLoading}
                onOAuthSignIn={handleOAuthSignIn}
              />
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
