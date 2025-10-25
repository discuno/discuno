'use client'

import { Mail } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

export function EmailSignInForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await signIn('resend', {
        email,
        redirect: false,
        callbackUrl: '/settings',
      })

      if (result.error) {
        toast.error('Sign In Failed', {
          description: 'Something went wrong. Please try again.',
        })
      } else {
        toast.success('Check your email', {
          description: 'A sign-in link has been sent to your email address.',
        })
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Sign In Failed', {
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsLoading(false)
      setEmail('')
    }
  }

  return (
    <form onSubmit={handleEmailSignIn} className="space-y-4">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full"
      />
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          'Sending...'
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Sign in with Email
          </>
        )}
      </Button>
    </form>
  )
}
