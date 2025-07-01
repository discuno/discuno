'use client'

import { Chrome, Code, Computer, Loader2, Shield } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSignIn = async (provider: 'google' | 'microsoft-entra-id') => {
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
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Development Badge */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <Code className="h-4 w-4" />
            Development Access
          </div>
        </div>

        <Card className="border/50 bg-card shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="bg-primary text-primary-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle className="text-foreground text-2xl font-bold">Admin Access</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to access the development dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google Sign In */}
            <Button
              onClick={() => handleSignIn('google')}
              disabled={isLoading !== null}
              className="h-12 w-full border border-gray-300 bg-white text-base font-medium text-gray-900 shadow-sm transition-all duration-200 hover:bg-gray-50"
              variant="outline"
            >
              {isLoading === 'google' ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <Chrome className="mr-3 h-5 w-5" />
              )}
              Continue with Google
            </Button>

            {/* Microsoft Entra ID Sign In */}
            <Button
              onClick={() => handleSignIn('microsoft-entra-id')}
              disabled={isLoading !== null}
              className="h-12 w-full border-0 bg-[#5865F2] text-base font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#4752C4]"
            >
              {isLoading === 'microsoft-entra-id' ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <Computer className="mr-3 h-5 w-5" />
              )}
              Continue with Microsoft Entra ID
            </Button>

            {/* Development Notice */}
            <div className="mt-6 rounded-lg border bg-slate-50 p-4 text-center dark:bg-slate-900">
              <p className="text-muted-foreground text-sm">
                🔧 <strong>Development Mode</strong>
                <br />
                This is for admin access during development
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to main site link */}
        <div className="mt-6 text-center">
          <a
            href="/auth"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Back to main site
          </a>
        </div>
      </div>
    </div>
  )
}
