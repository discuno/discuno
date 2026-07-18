import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DecisionContext } from '~/components/shared/DecisionContext'
import { createMetadata } from '~/lib/metadata'
import { FindResults, type FindSearchParams } from './components/FindResults'
import { FindResultsSkeleton } from './components/FindResultsSkeleton'

export const metadata: Metadata = createMetadata({
  title: 'Find a Student Mentor for Your College Decision',
  description:
    'Compare student mentors by school, field, graduation year, firsthand context, and the session options they publish.',
  alternates: { canonical: '/find' },
})

interface FindPageProps {
  searchParams: Promise<FindSearchParams>
}

async function RequestedFindResults({ searchParams }: FindPageProps) {
  const params = await searchParams

  return <FindResults searchParams={params} />
}

export default function FindPage({ searchParams }: FindPageProps) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <section className="bg-accent/35 border-b">
        <div className="mx-auto w-full max-w-[76rem] px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
          <div className="max-w-[42rem]">
            <h1 className="font-display text-4xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-5xl">
              Find a student with relevant context.
            </h1>
            <p className="text-muted-foreground mt-3 text-base leading-7 sm:text-lg">
              Narrow by school, field, or graduation year, then read each mentor&apos;s own profile.
            </p>
          </div>

          <div className="mt-8 border-t pt-6">
            <DecisionContext
              compact
              emptyTitle="Your decision"
              emptyDescription="Add the question you want to carry into a conversation."
            />
            <p className="text-muted-foreground mt-4 max-w-2xl text-xs leading-5">
              Your question stays in this browser session. It is not analyzed or used to rank these
              profiles.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<FindResultsSkeleton />}>
        <RequestedFindResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
