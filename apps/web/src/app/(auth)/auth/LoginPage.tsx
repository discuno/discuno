'use client'

import {
  BadgeCheck,
  Calendar,
  DollarSign,
  GraduationCap,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmailSignInForm } from '~/app/(auth)/auth/EmailSignInForm'
import { ThemeAwareFullLogo } from '~/components/shared/ThemeAwareFullLogo'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { authClient } from '~/lib/auth-client'

const benefits = [
  {
    icon: DollarSign,
    title: 'Earn Money',
    description: 'Set your own rates and get paid for sharing your knowledge',
  },
  {
    icon: Users,
    title: 'Help Students',
    description: 'Guide peers through challenges you recently overcame',
  },
  {
    icon: Calendar,
    title: 'Flexible Schedule',
    description: 'Choose when you want to mentor - you control your availability',
  },
  {
    icon: TrendingUp,
    title: 'Build Experience',
    description: 'Develop leadership and communication skills for your resume',
  },
]

const requirements = [
  'Valid .edu email address from your university',
  'Experience or expertise you want to share with students',
  'Commitment to providing quality mentorship sessions',
]

export function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: '/settings',
      })
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Sign In Failed', {
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="from-primary/5 to-background min-h-screen bg-gradient-to-b p-4 py-12">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <Link href="/">
              <ThemeAwareFullLogo />
            </Link>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Become a Mentor</h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl">
            Share your knowledge, earn money, and make a real impact on fellow students&apos;
            journeys
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Benefits & Requirements */}
          <div className="space-y-6">
            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <GraduationCap className="text-primary h-6 w-6" />
                  Why Become a Mentor?
                </CardTitle>
                <CardDescription>
                  Join hundreds of students earning income while helping their peers succeed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {benefits.map(benefit => {
                  const Icon = benefit.icon
                  return (
                    <div key={benefit.title} className="flex gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{benefit.title}</h3>
                        <p className="text-muted-foreground text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BadgeCheck className="text-primary h-5 w-5" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {requirements.map(requirement => (
                    <li key={requirement} className="flex gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Trust Badge */}
            <div className="bg-muted/50 rounded-lg border p-4 text-center">
              <p className="text-muted-foreground text-sm">
                All payments processed securely through Stripe. Setup takes less than 5 minutes.
              </p>
            </div>
          </div>

          {/* Right Column - Sign In Card */}
          <div className="flex flex-col justify-start">
            <div className="relative">
              <div className="absolute -inset-1 animate-pulse rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-50 blur-lg"></div>
              <Card className="border-border bg-card relative rounded-2xl shadow-2xl">
                <CardHeader className="text-center">
                  <CardTitle className="text-foreground text-2xl font-bold tracking-tight">
                    Get Started Today
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Sign in with your university email to create your mentor profile
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 items-center justify-center gap-4">
                    <div
                      onClick={() => handleOAuthSignIn('google')}
                      className="flex h-10 cursor-pointer items-center justify-center"
                    >
                      {isLoading === 'google' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Image
                          src={'/logos/web_light_sq_SI.svg'}
                          alt="Sign in with Google"
                          width={175}
                          height={40}
                        />
                      )}
                    </div>
                    <div
                      onClick={() => handleOAuthSignIn('microsoft')}
                      className="flex h-10 cursor-pointer items-center justify-center"
                    >
                      {isLoading === 'microsoft' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Image
                          src={'/logos/ms-symbollockup_signin_light.svg'}
                          alt="Sign in with Microsoft"
                          width={200}
                          height={40}
                        />
                      )}
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-muted-foreground w-full">
                        Or continue with email
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sign in with your email</DialogTitle>
                        <DialogDescription>
                          Enter your .edu email to receive a verification code.
                        </DialogDescription>
                      </DialogHeader>
                      <EmailSignInForm />
                    </DialogContent>
                  </Dialog>

                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-center text-xs">
                      By signing up, you agree to our{' '}
                      <Link href="/terms" className="text-primary hover:text-primary/80 underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        className="text-primary hover:text-primary/80 underline"
                      >
                        Privacy Policy
                      </Link>
                      . You must use a valid .edu email address.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* What's Next */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">After you sign in:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 font-bold">1.</span>
                  <span className="text-muted-foreground">Complete your mentor profile</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 font-bold">2.</span>
                  <span className="text-muted-foreground">Connect your Stripe account</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 font-bold">3.</span>
                  <span className="text-muted-foreground">Set your availability and rates</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 font-bold">4.</span>
                  <span className="text-muted-foreground">Start accepting bookings!</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
