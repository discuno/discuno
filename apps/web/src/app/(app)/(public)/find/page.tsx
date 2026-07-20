import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DecisionContext } from '~/components/shared/DecisionContext'
import { createMetadata } from '~/lib/metadata'
import { FindResults, type FindSearchParams } from './components/FindResults'
import { FindResultsSkeleton } from './components/FindResultsSkeleton'

export const metadata: Metadata = createMetadata({
  title: 'Find a Student Mentor for Your College Decision',
  description:
    'Browse student mentors by school, field, and graduation year, then compare their profiles and session options.',
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
      <section className="border-b">
        <div className="mx-auto w-full max-w-[76rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="max-w-[42rem]">
            <h1 className="text-4xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-5xl">
              Find someone who&apos;s been there.
            </h1>
            <p className="text-muted-foreground mt-3 text-base leading-7 sm:text-lg">
              Filter by school, field, or graduation year. Your question does not rank the results.
            </p>
          </div>

          <div className="border-foreground/20 mt-8 border-t pt-6">
            <DecisionContext
              compact
              emptyTitle="Your decision"
              emptyDescription="Add a question to keep it visible while you compare profiles."
            />
          </div>
        </div>
      </section>

      <Suspense fallback={<FindResultsSkeleton />}>
        <RequestedFindResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
