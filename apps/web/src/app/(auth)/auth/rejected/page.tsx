import { ArrowLeft, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const AuthRejectedPage = () => {
  return (
    <div className="field-notes min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Brand />
        <Button render={<Link href="/" />} nativeButton={false} variant="ghost" size="sm">
          <ArrowLeft aria-hidden="true" />
          Back to Discuno
        </Button>
      </div>

      <main className="mx-auto max-w-xl py-14 sm:py-20">
        <p className="eyebrow text-center">Mentor access</p>
        <Card className="stacked-note paper-panel ink-shadow corner-mark mt-5">
          <CardHeader className="items-center px-6 pt-8 text-center sm:px-10 sm:pt-10">
            <div className="bg-accent text-foreground mb-3 flex size-14 items-center justify-center rounded-md border">
              <GraduationCap className="size-7" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl leading-8 sm:text-3xl">
              This email cannot create a mentor profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8 text-center sm:px-10 sm:pb-10">
            <p className="text-muted-foreground text-base leading-7">
              You can still browse mentors and book sessions with this account. To share your
              experience as a mentor, sign in with a supported school-issued .edu address.
            </p>

            <div className="paper-panel bg-accent/25 p-5 text-left">
              <p className="font-semibold">What the school email check means</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                It confirms access to an institutional email address and supports the school
                affiliation shown on a profile. It is not an identity check, background check,
                professional credential, or promise of results.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button render={<Link href="/auth?intent=mentor" />} nativeButton={false}>
                Sign in with a school email
              </Button>
              <Button render={<Link href="/#mentors" />} nativeButton={false} variant="outline">
                <ArrowLeft aria-hidden="true" />
                Continue browsing
              </Button>
            </div>

            <p className="border-foreground/15 text-muted-foreground border-t pt-6 text-sm">
              Using a school email that is not recognized?{' '}
              <Link
                href="/support"
                className="text-primary font-medium underline underline-offset-4"
              >
                Contact support
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default AuthRejectedPage
