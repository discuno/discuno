import { ArrowLeft, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { IconLogo } from '~/components/icons/IconLogo'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const AuthRejectedPage = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="border-border/40 border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <IconLogo size={32} className="text-foreground" />
          <p className="text-foreground text-xl font-bold">Discuno</p>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-primary text-center text-sm font-semibold tracking-[0.14em] uppercase">
          Mentor access
        </p>
        <Card className="mt-6">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 text-primary mb-3 flex size-14 items-center justify-center rounded-full">
              <GraduationCap className="size-7" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold">
              This email cannot create a mentor profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground text-base leading-7">
              You can still browse mentors and book sessions with this account. To share your
              experience as a mentor, sign in with a supported school-issued .edu address.
            </p>

            <div className="bg-muted/50 rounded-xl p-5 text-left">
              <p className="font-semibold">What the school email check means</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                It confirms access to an institutional email address and supports the school
                affiliation shown on a profile. It is not an identity check, background check,
                professional credential, or promise of results.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/auth?intent=mentor">Try a school email</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/#mentors">
                  <ArrowLeft />
                  Continue browsing
                </Link>
              </Button>
            </div>

            <p className="border-border text-muted-foreground border-t pt-6 text-sm">
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
