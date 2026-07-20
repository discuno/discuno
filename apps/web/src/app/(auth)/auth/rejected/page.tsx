import { ArrowLeft, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { SkipLink } from '~/components/shared/SkipLink'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { buttonVariants } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import { cn } from '~/lib/utils'

const AuthRejectedPage = () => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <SkipLink href="#auth-rejected-content" />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Discuno
        </Link>
      </header>

      <main
        id="auth-rejected-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12 sm:px-6 sm:py-16"
      >
        <Empty className="w-full py-0 md:py-0" aria-labelledby="auth-rejected-title">
          <EmptyHeader className="max-w-md gap-3">
            <EmptyMedia variant="icon" className="bg-accent text-accent-foreground">
              <GraduationCap aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle
              id="auth-rejected-title"
              role="heading"
              aria-level={1}
              className="text-3xl leading-tight font-semibold tracking-tight"
            >
              This email cannot create a mentor profile
            </EmptyTitle>
            <EmptyDescription className="text-base leading-7">
              This account can still browse mentors and book sessions. Mentor profiles require a
              supported school-issued .edu address.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent className="max-w-md">
            <Alert className="text-left">
              <GraduationCap aria-hidden="true" />
              <AlertTitle>What the school email check means</AlertTitle>
              <AlertDescription>
                <p>
                  It confirms access to an institutional email address and supports the school
                  affiliation shown on a profile. It is not an identity check, background check,
                  professional credential, or promise of results. If a supported school address is
                  not recognized,{' '}
                  <Link href="/support" className="text-foreground underline underline-offset-4">
                    contact support
                  </Link>
                  .
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/auth?intent=mentor" className={buttonVariants({ size: 'lg' })}>
                Sign in with a school email
              </Link>
              <Link href="/find" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Continue browsing
              </Link>
            </div>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  )
}

export default AuthRejectedPage
