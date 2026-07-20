'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { SignInMethods, type AuthAudience } from '~/components/auth/SignInMethods'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { authClient } from '~/lib/auth-client'

type UserType = AuthAudience

export function LoginModal({
  isOpen,
  onOpenChange,
  mode = 'signin',
  defaultUserType = 'student',
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'signin' | 'signup'
  defaultUserType?: UserType
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <LoginModalContent
        key={`${isOpen ? 'open' : 'closed'}:${defaultUserType}`}
        mode={mode}
        defaultUserType={defaultUserType}
      />
    </Dialog>
  )
}

function LoginModalContent({
  mode,
  defaultUserType,
}: {
  mode: 'signin' | 'signup'
  defaultUserType: UserType
}) {
  const [userType, setUserType] = useState<UserType>(defaultUserType)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft') => {
    try {
      setIsLoading(provider)
      await authClient.signIn.social({
        provider,
        callbackURL: userType === 'mentor' ? '/settings' : window.location.href,
      })
    } catch {
      console.error('OAuth sign-in failed')
      toast.error('Could not sign you in', {
        description: 'Please try again or choose another sign-in method.',
      })
      setIsLoading(null)
    }
  }

  const title =
    mode === 'signin'
      ? 'Sign in'
      : userType === 'mentor'
        ? 'Create a mentor account'
        : 'Create an account'
  const description =
    userType === 'mentor'
      ? 'Use a school account to open your mentor workspace.'
      : 'Save your details for later, or continue browsing without an account.'

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[440px]">
      <DialogHeader className="pr-10">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <Tabs
        value={userType}
        onValueChange={value => setUserType(value as UserType)}
        className="w-full"
      >
        <TabsList variant="line" className="grid w-full grid-cols-2">
          <TabsTrigger value="student">Student</TabsTrigger>
          <TabsTrigger value="mentor">Mentor</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="mt-6">
          <SignInMethods
            audience="student"
            isLoading={isLoading}
            onOAuthSignIn={handleOAuthSignIn}
          />
        </TabsContent>

        <TabsContent value="mentor" className="mt-6">
          <SignInMethods
            audience="mentor"
            isLoading={isLoading}
            onOAuthSignIn={handleOAuthSignIn}
          />
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground text-xs leading-5">
        By continuing, you agree to the{' '}
        <Link href="/terms" className="text-foreground underline underline-offset-4">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-foreground underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </DialogContent>
  )
}
