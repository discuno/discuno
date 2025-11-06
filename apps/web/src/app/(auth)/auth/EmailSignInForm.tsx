'use client'

import { Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import { authClient } from '~/lib/auth-client'
import { validateEmail } from '~/lib/utils/validation'

export function EmailSignInForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid .edu email address')
    } else {
      setEmailError('')
    }
  }

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
        window.location.href = '/settings'
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
      <Field data-invalid={!!emailError}>
        <FieldLabel htmlFor="email">Email Address</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Mail className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            id="email"
            type="email"
            placeholder="Enter your .edu email"
            value={email}
            onChange={e => handleEmailChange(e.target.value)}
            aria-invalid={!!emailError}
            required
          />
          {isLoading && (
            <InputGroupAddon align="inline-end">
              <Loader2 className="h-4 w-4 animate-spin" />
            </InputGroupAddon>
          )}
        </InputGroup>
        <FieldDescription>We&apos;ll send you a verification code to sign in</FieldDescription>
        <FieldError>{emailError}</FieldError>
      </Field>
      <Button type="submit" disabled={isLoading || !!emailError} className="w-full">
        {isLoading ? 'Sending...' : 'Continue with Email'}
      </Button>
    </form>
  )
}
