import { ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
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

const NotFound = () => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border/80 border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12 sm:px-6 sm:py-16">
        <Empty className="w-full py-0 md:py-0" aria-labelledby="not-found-title">
          <EmptyHeader className="max-w-md gap-3">
            <EmptyMedia variant="icon">
              <Search aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle
              id="not-found-title"
              role="heading"
              aria-level={1}
              className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl"
            >
              This page isn&apos;t here
            </EmptyTitle>
            <EmptyDescription className="text-base leading-7">
              The link may be outdated or the page may have moved. Return home or browse mentors.
            </EmptyDescription>
          </EmptyHeader>

          <EmptyContent className="max-w-md">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/#mentors" className={buttonVariants({ size: 'lg' })}>
                <Search data-icon="inline-start" aria-hidden="true" />
                Browse mentors
              </Link>
              <Link href="/" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                Return home
              </Link>
            </div>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  )
}

export default NotFound
