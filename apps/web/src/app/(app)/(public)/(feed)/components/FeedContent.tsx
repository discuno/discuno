import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Compass,
  GraduationCap,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { PostGrid } from '~/app/(app)/(public)/(feed)/(post)/PostGrid'
import { FilterButton } from '~/app/(app)/(public)/(feed)/components/FilterButton'
import { Button } from '~/components/ui/button'
import { siteConfig } from '~/lib/metadata'
import { decodeUrlParam } from '~/lib/utils'
import { getInfiniteScrollPosts, getPostsByFilters } from '~/server/queries/posts'
import { getMajors, getSchools } from '~/server/queries/reference-data'

interface FeedContentProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

const guidanceTopics = [
  {
    icon: Compass,
    title: 'Before registration opens',
    description:
      'Ask what a course is really like, how the workload feels, or what your schedule leaves room for.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Before applications go out',
    description:
      'Learn how another student found the opportunity, prepared for interviews, and handled the parts no checklist explains.',
  },
  {
    icon: GraduationCap,
    title: 'Before you change direction',
    description:
      'Talk through a major switch, transfer, graduate school, or the moment when your original plan stops fitting.',
  },
]

const faqs = [
  {
    question: 'What can I talk through with a mentor?',
    answer:
      'Bring a specific college or early-career decision: a course, major, internship search, interview, campus question, graduate-school plan, or change in direction. Mentors share firsthand perspective; official academic, financial, legal, and medical decisions still belong with the appropriate professional.',
  },
  {
    question: 'How do I choose the right person?',
    answer:
      'Look for the overlap that matters to your question: the same school, field of study, recruiting path, or decision. Read the mentor’s own description and session options before choosing.',
  },
  {
    question: 'What does school-email verification mean?',
    answer:
      'It means the mentor demonstrated access to a supported school email address. It supports the school affiliation shown on the profile; it is not an identity check, background check, credential, endorsement, or promise of results.',
  },
  {
    question: 'What will a session cost?',
    answer:
      'Mentors decide whether a session is free or paid. You will see the duration and listed price before choosing a time, plus any applicable tax before a paid checkout is complete.',
  },
]

const MENTOR_PAGE_SIZE = 6

export const FeedContent = async ({ searchParams }: FeedContentProps) => {
  const [schools, majors] = await Promise.all([getSchools(), getMajors()])
  const currentYear = new Date().getFullYear()
  const gradYears = Array.from({ length: 7 }, (_, index) => {
    const year = currentYear - 1 + index
    return { id: year, value: year.toString(), label: year.toString() }
  })

  const decodedSchool = decodeUrlParam(searchParams.school)
  const decodedMajor = decodeUrlParam(searchParams.major)
  const decodedGradYear = decodeUrlParam(searchParams.gradYear)

  const schoolId = decodedSchool
    ? (schools.find(school => school.value === decodedSchool)?.id ?? null)
    : null
  const majorId = decodedMajor
    ? (majors.find(major => major.value === decodedMajor)?.id ?? null)
    : null
  const graduationYear = decodedGradYear
    ? (gradYears.find(year => year.label === decodedGradYear)?.id ?? null)
    : null
  const hasFilters = schoolId !== null || majorId !== null || graduationYear !== null

  const initialPage = hasFilters
    ? await getPostsByFilters(schoolId, majorId, graduationYear, MENTOR_PAGE_SIZE)
    : await getInfiniteScrollPosts(MENTOR_PAGE_SIZE)

  const mentorListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: hasFilters ? 'Filtered student mentors on Discuno' : 'Student mentors on Discuno',
    numberOfItems: initialPage.posts.length,
    itemListElement: initialPage.posts
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

      <section className="bg-[#10254a] text-white dark:bg-[#0b1730]">
        <div className="page-container grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <p className="text-sm font-semibold tracking-[0.14em] text-blue-200 uppercase">
              Firsthand perspective for college decisions
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.75rem]">
              Before your next big college decision, talk to someone who&apos;s been there.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100/85">
              Find a student who knows the school, major, or recruiting path you&apos;re
              considering. Ask the questions a search result cannot answer for you—and leave with a
              clearer next move.
            </p>

            <div className="mt-8 flex flex-col gap-3 text-sm text-blue-50 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {[
                'Choose or change a major',
                'Prepare for recruiting',
                'Make sense of what comes next',
              ].map(item => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-300" />
                  {item}
                </span>
              ))}
            </div>

            <Button asChild size="lg" className="mt-9 bg-white text-[#10254a] hover:bg-blue-50">
              <Link href="#mentors">
                Find someone who&apos;s been there
                <ArrowDown />
              </Link>
            </Button>
          </div>

          <div className="bg-card text-card-foreground border-border rounded-2xl border p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
                  Who would understand?
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Start with someone close to your situation
                </h2>
              </div>
              <Sparkles className="text-primary h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Choose the school, field, or stage that matters most. We&apos;ll show students whose
              experience overlaps.
            </p>

            <div className="mt-6 grid gap-3">
              <FilterButton
                filterItems={schools}
                startValue={searchParams.school ?? ''}
                queryName="school"
                label="School or university"
              />
              <FilterButton
                filterItems={majors}
                startValue={searchParams.major ?? ''}
                queryName="major"
                label="Major or field of study"
              />
              <FilterButton
                filterItems={gradYears}
                startValue={searchParams.gradYear ?? ''}
                queryName="gradYear"
                label="Graduation year"
              />
            </div>

            <div className="border-border mt-5 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">Broaden or change your search anytime.</span>
              {hasFilters && (
                <Link href="/#mentors" className="text-primary font-semibold hover:underline">
                  Clear all
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="page-container grid gap-px sm:grid-cols-3">
            {[
              {
                icon: BadgeCheck,
                title: 'Relevant lived experience',
                copy: 'you can evaluate for yourself',
              },
              {
                icon: Compass,
                title: 'Your question at the center',
                copy: 'not a generic playbook',
              },
              {
                icon: ArrowRight,
                title: 'A clearer next move',
                copy: 'that is still yours to make',
              },
            ].map(item => (
              <div key={item.title} className="flex items-center gap-3 py-5 sm:justify-center">
                <item.icon className="h-5 w-5 text-blue-200" />
                <p className="text-sm">
                  <span className="font-semibold">{item.title}</span>{' '}
                  <span className="text-blue-100/65">{item.copy}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-card scroll-mt-20 border-b">
        <div className="page-container py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:items-start">
            <div>
              <p className="eyebrow">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                A better next move starts with one specific question.
              </h2>
            </div>
            <ol className="grid gap-6 sm:grid-cols-3">
              {[
                [
                  '01',
                  'Name what you are trying to decide',
                  'A course? An internship? A change of direction?',
                ],
                [
                  '02',
                  'Find someone with relevant experience',
                  'Look for overlap in school, field, or the path they took.',
                ],
                [
                  '03',
                  'Talk it through',
                  'Pressure-test your options and decide what you want to do next.',
                ],
              ].map(([number, title, description]) => (
                <li key={number} className="border-border border-l pl-5">
                  <span className="text-primary text-xs font-bold tracking-[0.1em]">{number}</span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="mentors" className="scroll-mt-20 py-16 sm:py-20">
        <div className="page-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Student mentors</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Find someone who has been where you&apos;re headed
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                Look for the overlap that matters: the same school, a related major, or the next
                stage you are trying to reach.
              </p>
            </div>
            {hasFilters && (
              <Button asChild variant="ghost">
                <Link href="/#mentors">Clear all filters</Link>
              </Button>
            )}
          </div>

          <div className="bg-card mt-8 grid gap-3 rounded-xl border p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-3">
            <FilterButton
              filterItems={schools}
              startValue={searchParams.school ?? ''}
              queryName="school"
              label="School"
            />
            <FilterButton
              filterItems={majors}
              startValue={searchParams.major ?? ''}
              queryName="major"
              label="Major"
            />
            <FilterButton
              filterItems={gradYears}
              startValue={searchParams.gradYear ?? ''}
              queryName="gradYear"
              label="Graduation year"
            />
          </div>

          <div className="mt-8">
            <PostGrid
              schoolId={schoolId}
              majorId={majorId}
              graduationYear={graduationYear}
              initialPage={initialPage}
            />
          </div>
        </div>
      </section>

      <section className="bg-card border-y py-16 sm:py-20">
        <div className="page-container">
          <div className="max-w-2xl">
            <p className="eyebrow">Use the time well</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Bring the question that keeps circling in your head.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {guidanceTopics.map(topic => (
              <div key={topic.title} className="bg-background rounded-xl border p-6">
                <topic.icon className="text-primary h-6 w-6" />
                <h3 className="mt-5 text-lg font-semibold">{topic.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">{topic.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="page-container grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="eyebrow">Common questions</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
              Know before you book
            </h2>
          </div>
          <div className="divide-border border-y">
            {faqs.map(faq => (
              <details key={faq.question} className="group border-b last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="text-primary text-xl font-normal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground max-w-2xl pb-5 text-sm leading-7">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#10254a] text-white dark:bg-[#0b1730]">
        <div className="page-container flex flex-col gap-8 py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16">
          <div>
            <p className="text-sm font-semibold text-blue-200">You learned it the hard way.</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.035em]">
              Help someone else skip a few dead ends.
            </h2>
          </div>
          <Button asChild size="lg" className="shrink-0 bg-white text-[#10254a] hover:bg-blue-50">
            <Link href="/for-mentors">
              See how mentoring works
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
