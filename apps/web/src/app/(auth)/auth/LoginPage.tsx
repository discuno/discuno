'use client'

import { Chrome, Computer, Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
export function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft-entra-id') => {
    try {
      setIsLoading(provider)
      await signIn(provider, {
        callbackUrl: '/',
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
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-0.5 animate-pulse rounded-lg bg-gradient-to-r from-blue-600 to-cyan-400 opacity-75 blur"></div>
        <Card className="border-border bg-card relative shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to continue to Discuno
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleOAuthSignIn('google')}
                disabled={isLoading !== null}
                variant="outline"
                className="w-full"
              >
                {isLoading === 'google' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Chrome className="mr-2 h-4 w-4" />
                )}
                Google
              </Button>
              <Button
                onClick={() => handleOAuthSignIn('microsoft-entra-id')}
                disabled={isLoading !== null}
                variant="outline"
                className="w-full"
              >
                {isLoading === 'microsoft-entra-id' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Computer className="mr-2 h-4 w-4" />
                )}
                Microsoft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
