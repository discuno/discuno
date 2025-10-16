'use client'

import { Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
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
export function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft-entra-id') => {
    try {
      setIsLoading(provider)
      await signIn(provider, {
        callbackUrl: '/settings',
        redirect: true,
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative">
          <div className="absolute -inset-1 animate-pulse rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-50 blur-lg"></div>
          <Card className="border-border bg-card relative rounded-2xl shadow-2xl">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <ThemeAwareFullLogo />
              </div>
              <CardTitle className="text-foreground text-2xl font-bold tracking-tight">
                Get Started
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in or create an account to continue
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
                  onClick={() => handleOAuthSignIn('microsoft-entra-id')}
                  className="flex h-10 cursor-pointer items-center justify-center"
                >
                  {isLoading === 'microsoft-entra-id' ? (
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
            </CardContent>
          </Card>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" className="text-muted-foreground mt-4 w-full">
              Or continue with email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign in with your email</DialogTitle>
              <DialogDescription>We&apos;ll send you a magic link to your inbox.</DialogDescription>
            </DialogHeader>
            <EmailSignInForm />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
