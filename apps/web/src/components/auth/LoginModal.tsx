'use client'

import { Briefcase, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmailSignInForm } from '~/app/(auth)/auth/EmailSignInForm'
import { ThemeAwareIconLogo } from '~/components/shared/ThemeAwareIconLogo'
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

export function LoginModal({
  isOpen,
  onOpenChange,
  mode = 'signin',
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'signin' | 'signup'
}) {
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 p-6 sm:max-w-[400px]">
        <DialogHeader className="flex flex-col items-center space-y-4 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
            <ThemeAwareIconLogo />
          </div>
          <div className="space-y-1.5 text-center">
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">
              {mode === 'signin' ? 'Welcome back' : 'Create an account'}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">
              {mode === 'signin'
                ? 'Sign in to your account'
                : 'Join Discuno to connect with mentors'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs value={userType} onValueChange={setUserType} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-1">
            <TabsTrigger
              value="student"
              className="gap-2 rounded-md font-medium transition-all data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400 data-[state=inactive]:hover:bg-zinc-800/50 data-[state=inactive]:hover:text-zinc-300"
            >
              <GraduationCap className="h-4 w-4" />
              Student
            </TabsTrigger>
            <TabsTrigger
              value="mentor"
              className="gap-2 rounded-md font-medium transition-all data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900 data-[state=inactive]:text-zinc-400 data-[state=inactive]:hover:bg-zinc-800/50 data-[state=inactive]:hover:text-zinc-300"
            >
              <Briefcase className="h-4 w-4" />
              Mentor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="mt-6 space-y-4">
            <div className="grid gap-3">
              <Button
                variant="outline"
                size="lg"
                className="bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground relative flex h-10 w-full items-center justify-center gap-3 font-normal transition-all active:scale-[0.98]"
                onClick={() => handleOAuthSignIn('google')}
                disabled={!!isLoading}
              >
                {isLoading === 'google' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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
                className="bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground relative flex h-10 w-full items-center justify-center gap-3 font-normal transition-all active:scale-[0.98]"
                onClick={() => handleOAuthSignIn('microsoft')}
                disabled={!!isLoading}
              >
                {isLoading === 'microsoft' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <>
                    <svg viewBox="0 0 23 23" className="h-4 w-4" aria-hidden="true">
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

            <div className="relative pt-2 opacity-0">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-transparent" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mentor" className="mt-6 space-y-4">
            <div className="grid gap-3">
              <Button
                variant="outline"
                size="lg"
                className="bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground relative flex h-10 w-full items-center justify-center gap-3 font-normal transition-all active:scale-[0.98]"
                onClick={() => handleOAuthSignIn('google')}
                disabled={!!isLoading}
              >
                {isLoading === 'google' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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
                className="bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground relative flex h-10 w-full items-center justify-center gap-3 font-normal transition-all active:scale-[0.98]"
                onClick={() => handleOAuthSignIn('microsoft')}
                disabled={!!isLoading}
              >
                {isLoading === 'microsoft' ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <>
                    <svg viewBox="0 0 23 23" className="h-4 w-4" aria-hidden="true">
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

            <div className="relative pt-2">
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
                    className="text-muted-foreground hover:text-foreground h-9 w-full font-normal"
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

        <div className="text-muted-foreground mt-4 text-center text-xs">
          <p>
            By clicking continue, you agree to our{' '}
            <Link href="/terms" className="hover:text-primary underline underline-offset-4">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="hover:text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
