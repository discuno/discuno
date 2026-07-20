'use client'

import { EmailSignInForm } from '~/components/auth/EmailSignInForm'
import { Button } from '~/components/ui/button'
import { FieldSeparator } from '~/components/ui/field'
import { Spinner } from '~/components/ui/spinner'

export type AuthAudience = 'student' | 'mentor'

export function SignInMethods({
  audience,
  isLoading,
  onOAuthSignIn,
  returnTo,
}: {
  audience: AuthAudience
  isLoading: string | null
  onOAuthSignIn: (provider: 'google' | 'microsoft') => Promise<void>
  returnTo?: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <ProviderButtons isLoading={isLoading} onSignIn={onOAuthSignIn} />

      {audience === 'mentor' && (
        <>
          <FieldSeparator>Or use your school email</FieldSeparator>
          <EmailSignInForm returnTo={returnTo} />
        </>
      )}
    </div>
  )
}

function ProviderButtons({
  isLoading,
  onSignIn,
}: {
  isLoading: string | null
  onSignIn: (provider: 'google' | 'microsoft') => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => onSignIn('google')}
        disabled={Boolean(isLoading)}
        aria-busy={isLoading === 'google'}
      >
        {isLoading === 'google' ? <Spinner data-icon="inline-start" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => onSignIn('microsoft')}
        disabled={Boolean(isLoading)}
        aria-busy={isLoading === 'microsoft'}
      >
        {isLoading === 'microsoft' ? <Spinner data-icon="inline-start" /> : <MicrosoftIcon />}
        Continue with Microsoft
      </Button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" data-icon="inline-start" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.24 1.06-3.72 1.06a6.44 6.44 0 0 1-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.08H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.57 10.57 0 0 0 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84A6.44 6.44 0 0 1 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" data-icon="inline-start" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}
