'use client'

import { Mail } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp'
import { Spinner } from '~/components/ui/spinner'
import { authClient } from '~/lib/auth-client'
import { validateEduEmail } from '~/lib/utils/validation'

export function EmailSignInForm({ returnTo = '/settings' }: { returnTo?: string }) {
  const emailInputId = useId()
  const otpInputId = useId()
  const otpDescriptionId = useId()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setRequestError('')

    if (value && !validateEduEmail(value)) {
      setEmailError('Enter a valid school-issued .edu email address.')
    } else {
      setEmailError('')
    }
  }

  const requestCode = async () => {
    setIsLoading(true)
    setRequestError('')

    try {
      const { error, data } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      })

      if (error || !data.success) {
        setRequestError('We could not send a code. Check the address and try again.')
        toast.error('Could not send a code', {
          description: 'Check the address and try again.',
        })
      } else {
        setShowOtpInput(true)
        setOtpError('')
        toast.success('Check your school inbox', {
          description: 'Your six-digit sign-in code is on its way.',
        })
      }
    } catch {
      console.error('School email code request failed')
      setRequestError('We could not send a code. Please try again.')
      toast.error('Could not send a code', {
        description: 'Please try again in a moment.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateEduEmail(email)) {
      setEmailError('Enter a valid school-issued .edu email address.')
      return
    }

    await requestCode()
  }

  const handleOtpComplete = async (value: string) => {
    setIsLoading(true)
    setOtpError('')

    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp: value,
      })

      if (error) {
        setOtpError('That code is invalid or expired. Request a new one and try again.')
        toast.error('Could not verify that code', {
          description: 'Request a new code and try again.',
        })
        setOtp('')
      } else {
        toast.success('School email confirmed', {
          description: 'Taking you back to Discuno.',
        })
        window.location.href = returnTo
      }
    } catch {
      console.error('School email code verification failed')
      setOtpError('We could not verify that code. Please try again.')
      toast.error('Could not verify that code', {
        description: 'Please try again in a moment.',
      })
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  if (showOtpInput) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-base font-semibold">Check your school inbox</p>
          <p id={otpDescriptionId} className="text-muted-foreground text-sm leading-6">
            Enter the six-digit code sent to{' '}
            <span className="text-foreground font-medium break-all">{email}</span>.
          </p>
        </div>

        <Field data-invalid={Boolean(otpError)}>
          <FieldLabel htmlFor={otpInputId} className="sr-only">
            Six-digit sign-in code
          </FieldLabel>
          <InputOTP
            id={otpInputId}
            maxLength={6}
            value={otp}
            onChange={value => {
              setOtp(value)
              setOtpError('')
              setRequestError('')
            }}
            onComplete={handleOtpComplete}
            disabled={isLoading}
            autoFocus
            autoComplete="one-time-code"
            inputMode="numeric"
            aria-describedby={otpDescriptionId}
            aria-invalid={Boolean(otpError)}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot key={index} index={index} className="size-11 text-base sm:size-12" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <FieldError className="text-center">{otpError || requestError}</FieldError>
        </Field>

        <p
          className="text-muted-foreground min-h-5 text-center text-xs"
          role="status"
          aria-live="polite"
        >
          {isLoading ? 'Working…' : 'The code can only be used once.'}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={requestCode} disabled={isLoading}>
            Send another code
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowOtpInput(false)
              setOtp('')
              setOtpError('')
              setRequestError('')
            }}
            disabled={isLoading}
          >
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
      <Field data-invalid={Boolean(emailError || requestError)}>
        <FieldLabel htmlFor={emailInputId}>School email</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={emailInputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@school.edu"
            value={email}
            onChange={event => handleEmailChange(event.target.value)}
            aria-invalid={Boolean(emailError || requestError)}
            required
          />
          <InputGroupAddon align="inline-start">
            <Mail aria-hidden="true" />
          </InputGroupAddon>
          {isLoading && (
            <InputGroupAddon align="inline-end">
              <Spinner />
              <span className="sr-only">Sending code</span>
            </InputGroupAddon>
          )}
        </InputGroup>
        <FieldDescription>
          We will email you a one-time code. Mentor access opens only for supported school domains.
        </FieldDescription>
        <FieldError>{emailError || requestError}</FieldError>
      </Field>
      <Button type="submit" disabled={isLoading || Boolean(emailError)} className="w-full">
        {isLoading && <Spinner data-icon="inline-start" />}
        {isLoading ? 'Sending code…' : 'Email me a sign-in code'}
      </Button>
    </form>
  )
}
