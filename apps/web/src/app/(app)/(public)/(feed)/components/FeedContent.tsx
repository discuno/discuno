import { ArrowDown, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { PostCard } from '~/app/(app)/(public)/(feed)/(post)/PostCard'
import { buttonVariants } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { siteConfig } from '~/lib/metadata'
import { cn } from '~/lib/utils'
import { getInfiniteScrollPosts } from '~/server/queries/posts'
import { DecisionComposer } from './DecisionComposer'

const MENTOR_PREVIEW_SIZE = 3

function MentorPreviewLoading() {
  return (
    <div className="divide-border border-y" aria-label="Loading student mentors">
      {[0, 1, 2].map(item => (
        <div
          key={item}
          className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6"
        >
          <Skeleton className="aspect-square w-full rounded-xl" />
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
          Mentor profiles are being prepared. You can still narrow by school and field.
        </p>
      )}
    </>
  )
}

export function FeedContent() {
  return (
    <>
      <section className="border-b">
        <div className="page-shell grid min-h-[calc(100svh-4.5rem)] gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-12">
          <div className="public-enter lg:col-span-7 lg:pr-6">
            <h1 className="display-hero max-w-3xl">
              What are you <span className="marker-highlight">deciding?</span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
              Name the question, then find a student with firsthand context that matters.
            </p>
            <DecisionComposer />
          </div>

          <div className="public-enter-delayed bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-5 lg:aspect-[4/5]">
            <Image
              src="/images/question-at-library.jpg"
              alt="A student pauses over notes while considering a college decision"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 48vw"
            />
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24" aria-labelledby="mentor-preview-heading">
        <div className="grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-20">
          <div className="max-w-md">
            <h2 id="mentor-preview-heading" className="display-heading">
              Find the overlap that matters.
            </h2>
            <p className="text-muted-foreground mt-5 leading-7">
              Compare school, field, and each mentor&apos;s own account of what they can help with.
            </p>
            <Link
              href="/find"
              className={buttonVariants({
                variant: 'outline',
                className: 'mt-6',
              })}
            >
              Browse all mentors
              <ArrowRight data-icon="inline-end" />
            </Link>
          </div>

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
            <h2 className="display-heading">Firsthand context changes the next question.</h2>
            <div className="border-foreground/20 mt-7 flex flex-col gap-5 border-y py-6 leading-7">
              <p>
                Official sources can explain requirements. Another student can show where the
                tradeoffs appeared in real life.
              </p>
              <p className="text-muted-foreground">
                Use their perspective to test your assumptions, spot what you have not asked, and
                choose a smaller next move.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-14 sm:py-18" aria-labelledby="trust-heading">
        <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <h2 id="trust-heading" className="text-lg font-semibold">
            Know what the context means
          </h2>
          <div className="text-muted-foreground grid gap-4 leading-7 sm:grid-cols-2 sm:gap-8">
            <p>
              School email confirmed means access to a supported institutional address. It supports
              a stated affiliation, not identity, expertise, or outcomes.
            </p>
            <p>
              Peer perspective complements official academic, financial, legal, and medical
              guidance. The decision stays with you.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="page-shell flex flex-col items-start gap-7 py-14 sm:py-18 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="display-heading max-w-3xl">
            Start with the question already on your mind.
          </h2>
          <a href="#decision-composer" className={cn(buttonVariants({ size: 'lg' }), 'shrink-0')}>
            Start with your question
            <ArrowDown data-icon="inline-end" />
          </a>
        </div>
      </section>
    </>
  )
}
