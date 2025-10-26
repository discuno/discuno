'use client'

import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import { authClient } from '~/lib/auth-client'

export function EmailSignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error, data } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      })

      if (error) {
        toast.error('Sign In Failed', {
          description: 'Something went wrong. Please try again.',
        })
      } else if (data.success) {
        setShowOtpInput(true)
        toast.success('Check your email', {
          description: 'A verification code has been sent to your email address.',
        })
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Sign In Failed', {
        description: 'Something went wrong. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpComplete = async (value: string) => {
    setIsLoading(true)
    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp: value,
      })

      if (error) {
        toast.error('Verification Failed', {
          description: 'Invalid or expired code. Please try again.',
        })
        setOtp('')
      } else {
        toast.success('Success!', {
          description: 'You have been signed in successfully.',
        })
        router.push('/settings')
      }
    } catch (error) {
      console.error('Verification error:', error)
      toast.error('Verification Failed', {
        description: 'Something went wrong. Please try again.',
      })
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  if (showOtpInput) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
        </div>
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            onComplete={handleOtpComplete}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setShowOtpInput(false)
            setOtp('')
            setEmail('')
          }}
          className="w-full"
        >
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Enter your .edu email"
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
