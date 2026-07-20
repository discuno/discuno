import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { PostCard } from '~/app/(app)/(public)/(feed)/(post)/PostCard'
import { buttonVariants } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { siteConfig } from '~/lib/metadata'
import { getInfiniteScrollPosts } from '~/server/queries/posts'
import { DecisionComposer } from './DecisionComposer'

const MENTOR_PREVIEW_SIZE = 3

function MentorPreviewLoading() {
  return (
    <div className="divide-border border-y" aria-label="Loading student mentors">
      {[0, 1, 2].map(item => (
        <div
          key={item}
          className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-7 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-7"
        >
          <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          <div className="flex flex-col gap-3 py-1">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

async function MentorPreview() {
  const preview = await getInfiniteScrollPosts(MENTOR_PREVIEW_SIZE)
  const mentors = preview.posts.slice(0, MENTOR_PREVIEW_SIZE)
  const mentorListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Student mentors on Discuno',
    numberOfItems: mentors.length,
    itemListElement: mentors
      .filter(mentor => mentor.username)
      .map((mentor, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteConfig.url}/mentor/${mentor.username}`,
        name: `${mentor.name ?? 'Student mentor'}${mentor.school ? ` at ${mentor.school}` : ''}`,
      })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(mentorListJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {mentors.length > 0 ? (
        <div role="list" aria-label="Student mentors" className="divide-border border-y">
          {mentors.map(mentor => (
            <PostCard key={mentor.id} card={mentor} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground border-y py-8 leading-7">
          No mentor profiles are live yet.
        </p>
      )}
    </>
  )
}

export function FeedContent() {
  return (
    <>
      <section className="border-b">
        <div className="page-shell grid min-h-[calc(100svh-4.5rem)] gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-12">
          <div className="public-enter lg:col-span-7">
            <h1 className="display-hero max-w-3xl">
              What are you trying to <span className="marker-highlight">decide?</span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
              Talk it through with a student who knows the school, field, or choice firsthand.
            </p>
            <DecisionComposer />
          </div>

          <div className="public-enter-delayed bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-5 lg:aspect-[4/5]">
            <Image
              src="/images/question-at-library.jpg"
              alt="A student pauses over notes while considering a college decision"
              fill
              preload
              className="object-cover"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 48vw"
            />
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24" aria-labelledby="mentor-preview-heading">
        <div className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              id="mentor-preview-heading"
              className="text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-3xl"
            >
              Start with a student who&apos;s been there.
            </h2>
            <p className="text-muted-foreground mt-5 leading-7">
              Compare what they studied, where they went, and what they can help you think through.
            </p>
          </div>

          <Link href="/find" className={buttonVariants({ variant: 'outline' })}>
            Browse all mentors
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>

        <div className="mt-2">
          <Suspense fallback={<MentorPreviewLoading />}>
            <MentorPreview />
          </Suspense>
        </div>
      </section>

      <section id="how-it-works" className="border-y">
        <div className="page-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="bg-muted relative aspect-[3/2] overflow-hidden rounded-xl lg:col-span-7">
            <Image
              src="/images/conversation-after-class.jpg"
              alt="Two students continue a thoughtful conversation after class"
              fill
              className="object-cover"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 58vw"
            />
          </div>

          <div className="max-w-lg lg:col-span-5">
            <h2 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
              Question. Person. Time.
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">That is the whole path.</p>

            <ol className="divide-border mt-8 divide-y border-y">
              <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-5">
                <span className="text-primary text-sm font-semibold" aria-hidden="true">
                  01
                </span>
                <div>
                  <h3 className="font-semibold">Question</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Write the decision in your own words.
                  </p>
                </div>
              </li>
              <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-5">
                <span className="text-primary text-sm font-semibold" aria-hidden="true">
                  02
                </span>
                <div>
                  <h3 className="font-semibold">Person</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Choose a student whose experience overlaps.
                  </p>
                </div>
              </li>
              <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-5">
                <span className="text-primary text-sm font-semibold" aria-hidden="true">
                  03
                </span>
                <div>
                  <h3 className="font-semibold">Time</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Pick a session and bring the same question.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="page-shell py-14 sm:py-18" aria-labelledby="trust-heading">
        <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <h2 id="trust-heading" className="text-lg font-semibold">
            What Discuno can confirm
          </h2>
          <div className="text-muted-foreground grid gap-4 leading-7 sm:grid-cols-2 sm:gap-8">
            <p>
              School email confirmed means access to a supported school address. It does not verify
              identity, expertise, or outcomes.
            </p>
            <p>
              Student perspective complements official academic, financial, legal, and medical
              guidance. The decision stays with you.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
