import { Chrome, Computer, GraduationCap, Loader2, Shield } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export function LoginPage() {
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
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Discuno</h1>
        <p className="text-muted-foreground mt-2">
          Sign in with your educational email to get started
        </p>
      </div>

      {/* Educational Email Requirement Alert */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Educational Email Required
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Please use your university email address (.edu) to access Discuno. This helps us
                maintain our community of verified students and mentors.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign In Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sign In Options
          </CardTitle>
          <CardDescription>Choose your preferred method to sign in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Sign In */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleSignIn('google')}
            disabled={!!isLoading}
          >
            {isLoading === 'google' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>

          {/* Microsoft Sign In */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleSignIn('microsoft-entra-id')}
            disabled={!!isLoading}
          >
            {isLoading === 'microsoft-entra-id' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Computer className="mr-2 h-4 w-4" />
            )}
            Continue with Microsoft
          </Button>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Having trouble signing in?{' '}
          <Link href="/auth/error" className="text-primary underline-offset-4 hover:underline">
            Get help
          </Link>
        </p>
      </div>
    </div>
  )
}
