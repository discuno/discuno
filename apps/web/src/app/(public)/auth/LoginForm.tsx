'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { ArrowRight, Sparkles, Chrome, MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface LoginFormProps {
  variant?: 'default' | 'cta'
}

export function LoginForm({ variant = 'default' }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSignIn = async (provider: 'google' | 'discord') => {
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

  if (variant === 'cta') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          onClick={() => handleSignIn('google')}
          size="lg"
          disabled={isLoading !== null}
          className="bg-primary text-primary-foreground hover:bg-primary/90 group relative overflow-hidden px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          {isLoading === 'google' ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
          )}
          Get Early Access
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="border/50 bg-card/95 w-full shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-foreground text-center text-2xl font-bold">
          Welcome to Discuno
        </CardTitle>
        <CardDescription className="text-muted-foreground text-center">
          Sign in to connect with expert college mentors and start your journey to success.
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

        {/* Discord Sign In */}
        <Button
          onClick={() => handleSignIn('discord')}
          disabled={isLoading !== null}
          className="h-12 w-full border-0 bg-[#5865F2] text-base font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#4752C4]"
        >
          {isLoading === 'discord' ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <MessageSquare className="mr-3 h-5 w-5" />
          )}
          Continue with Discord
        </Button>

        {/* Divider with "or" */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">Early Access</span>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
            <span className="text-foreground text-sm font-medium">Launching Soon</span>
          </div>
          <p className="text-muted-foreground text-xs">
            We&apos;re putting the finishing touches on the platform. Sign up now to be first in
            line!
          </p>
        </div>

        {/* Trust & Security */}
        <div className="border/50 border-t pt-4 text-center">
          <p className="text-muted-foreground text-xs">
            🔒 Secure sign-in • ✅ Verified mentors • 🎓 College students only
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
