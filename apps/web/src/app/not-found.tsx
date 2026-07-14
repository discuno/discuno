import { ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { Button } from '~/components/ui/button'

const NotFound = () => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border/80 border-b">
        <div className="page-container flex h-16 items-center">
          <Brand />
        </div>
      </header>

      <main className="page-container flex flex-1 items-center py-16 sm:py-24">
        <section className="mx-auto w-full max-w-2xl" aria-labelledby="not-found-title">
          <p className="eyebrow">404 · Page not found</p>
          <h1
            id="not-found-title"
            className="mt-4 text-4xl font-bold tracking-[-0.04em] text-balance sm:text-5xl"
          >
            This page isn&apos;t here.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-base leading-7 sm:text-lg">
            The link may be outdated, or the page may have moved. You can return home or browse the
            mentors currently available on Discuno.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/#mentors">
                <Search aria-hidden="true" />
                Browse mentors
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                Return home
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default NotFound
