'use client'

import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Loader2,
  Mail,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { joinWaitlist } from './actions'

interface WaitlistFormProps {
  variant?: 'default' | 'cta'
}

export function WaitlistForm({ variant = 'default' }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await joinWaitlist(formData)

        // Handle different status responses
        switch (result.status) {
          case 'success':
            toast.success('Welcome to the waitlist!', {
              description:
                "We'll notify you as soon as Discuno launches. Check your email for confirmation.",
              icon: <CheckCircle className="h-5 w-5" />,
              duration: 6000,
            })
            setEmail('') // Clear form on success
            break

          case 'already-registered':
            toast.info("You're already on the list!", {
              description: "This email is already registered. We'll notify you when we launch.",
              icon: <Mail className="h-5 w-5" />,
              duration: 5000,
            })
            break

          case 'invalid-email':
            toast.error('Invalid email address', {
              description: 'Please enter a valid email address to join our waitlist.',
              icon: <AlertCircle className="h-5 w-5" />,
              duration: 4000,
            })
            break

          case 'error':
          default:
            toast.error('Something went wrong', {
              description: "We couldn't add you to the waitlist right now. Please try again.",
              icon: <XCircle className="h-5 w-5" />,
              duration: 5000,
            })
            break
        }
      } catch {
        toast.error('Something went wrong', {
          description: "We couldn't add you to the waitlist right now. Please try again.",
          icon: <XCircle className="h-5 w-5" />,
          duration: 5000,
        })
      }
    })
  }

  if (variant === 'cta') {
    return (
      <form action={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="email-cta" className="sr-only">
            Email address
          </Label>
          <Input
            id="email-cta"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isPending}
            className="border-primary/20 bg-background focus:ring-primary/20 h-12 text-base shadow-sm focus:ring-2"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !email}
          className="bg-primary text-primary-foreground hover:bg-primary/90 group h-12 px-8 font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
          )}
          Join Waitlist
          {!isPending && (
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          )}
        </Button>
      </form>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isPending}
            className="border-primary/20 bg-background focus:border-primary focus:ring-primary/20 pl-10 text-base shadow-sm transition-all duration-200 focus:ring-2"
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isPending || !email}
        className="bg-primary text-primary-foreground hover:bg-primary/90 group w-full font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Joining Waitlist...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-5 w-5" />
            Join the Waitlist
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Get notified when we launch. No spam, ever.
      </p>
    </form>
  )
}
