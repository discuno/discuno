'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmailSignInForm } from '~/app/(auth)/auth/EmailSignInForm'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Spinner } from '~/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { authClient } from '~/lib/auth-client'

export function LoginPage() {
  const [userType, setUserType] = useState('student')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: '/settings',
        disableRedirect: true,
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
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Visual/Brand (Hidden on mobile) */}
      <div className="relative hidden w-1/2 bg-zinc-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="relative z-10">
          <Link href="/">
            <Image
              src="/logos/white-full-logo.svg"
              alt="Discuno Logo"
              width={150}
              height={50}
              priority
            />
          </Link>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-200 duration-700">
            <h1 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {userType === 'student' ? (
                <>
                  Find your path. <br />
                  <span className="text-zinc-400">Unlock your potential.</span>
                </>
              ) : (
                <>
                  Share your wisdom. <br />
                  <span className="text-zinc-400">Inspire the future.</span>
                </>
              )}
            </h1>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both space-y-4 text-lg text-zinc-300 delay-300 duration-700">
            {userType === 'student' ? (
              <p>
                Connect with mentors who have walked the path you&apos;re on. Get real advice, study
                tips, and career guidance from students at top universities.
              </p>
            ) : (
              <p>
                Join a curated community of high-achieving student mentors. Earn money on your own
                schedule while building leadership skills that stand out.
              </p>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-500 duration-700">
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-10 w-10 overflow-hidden rounded-full border-2 border-zinc-900 bg-zinc-700`}
                  >
                    <div className="h-full w-full bg-linear-to-br from-zinc-600 to-zinc-800" />
                  </div>
                ))}
              </div>
              <p>Trusted by students from 50+ universities</p>
            </div>
          </div>
        </div>

        {/* Background elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl filter" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl filter" />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="bg-background flex w-full flex-col items-center justify-center p-6 lg:w-1/2 lg:p-12 xl:p-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <Tabs value={userType} onValueChange={setUserType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="mentor">Mentor</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-4 space-y-4">
              <div className="grid gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-background hover:bg-muted/50 relative flex h-12 w-full items-center justify-center gap-3 text-base font-normal transition-all active:scale-[0.98]"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={!!isLoading}
                >
                  {isLoading === 'google' ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="bg-background hover:bg-muted/50 relative flex h-12 w-full items-center justify-center gap-3 text-base font-normal transition-all active:scale-[0.98]"
                  onClick={() => handleOAuthSignIn('microsoft')}
                  disabled={!!isLoading}
                >
                  {isLoading === 'microsoft' ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <>
                      <svg viewBox="0 0 23 23" className="h-5 w-5" aria-hidden="true">
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      <span>Continue with Microsoft</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative pt-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mentor" className="mt-4 space-y-4">
              <div className="grid gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-background hover:bg-muted/50 relative flex h-12 w-full items-center justify-center gap-3 text-base font-normal transition-all active:scale-[0.98]"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={!!isLoading}
                >
                  {isLoading === 'google' ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="bg-background hover:bg-muted/50 relative flex h-12 w-full items-center justify-center gap-3 text-base font-normal transition-all active:scale-[0.98]"
                  onClick={() => handleOAuthSignIn('microsoft')}
                  disabled={!!isLoading}
                >
                  {isLoading === 'microsoft' ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <>
                      <svg viewBox="0 0 23 23" className="h-5 w-5" aria-hidden="true">
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      <span>Continue with Microsoft</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative pt-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">Or</span>
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground w-full font-normal"
                    >
                      Continue with Email
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
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-muted-foreground text-center text-sm">
            <p>
              By clicking continue, you agree to our{' '}
              <Link href="/terms" className="hover:text-primary underline underline-offset-4">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="hover:text-primary underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
