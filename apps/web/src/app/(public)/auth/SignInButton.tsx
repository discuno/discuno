'use client'

import { Button } from '~/components/ui/button'
import { signIn } from 'next-auth/react'
import { ArrowRight, Sparkles } from 'lucide-react'

interface SignInButtonProps {
  variant?: 'default' | 'cta'
}

export function SignInButton({ variant = 'default' }: SignInButtonProps) {
  const handleSignIn = async () => {
    try {
      await signIn()
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  if (variant === 'cta') {
    return (
      <Button
        onClick={handleSignIn}
        size="lg"
        className="bg-primary text-primary-foreground hover:bg-primary/90 group relative overflow-hidden px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
      >
        <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
        Get Early Access
        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Button>
    )
  }

  return (
    <Button
      onClick={handleSignIn}
      size="lg"
      className="bg-primary text-primary-foreground hover:bg-primary/90 group px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
    >
      Sign In to Get Started
      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
    </Button>
  )
}
