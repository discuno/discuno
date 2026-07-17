import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  Compass,
  GraduationCap,
  MessageCircleQuestion,
  Route,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { PostGrid } from '~/app/(app)/(public)/(feed)/(post)/PostGrid'
import { DiscoveryFilters } from '~/app/(app)/(public)/(feed)/components/DiscoveryFilters'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { Button } from '~/components/ui/button'
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '~/components/ui/item'
import { siteConfig } from '~/lib/metadata'
import { decodeUrlParam } from '~/lib/utils'
import { getInfiniteScrollPosts, getPostsByFilters } from '~/server/queries/posts'
import { getMajors, getSchools } from '~/server/queries/reference-data'

interface FeedContentProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

const decisionPrompts = [
  {
    icon: GraduationCap,
    question: 'Is this major actually right for me?',
  },
  {
    icon: BriefcaseBusiness,
    question: 'What really helped you land that internship?',
  },
  {
    icon: Compass,
    question: 'Should I change direction or give it more time?',
  },
]

const conversationSteps = [
  {
    icon: MessageCircleQuestion,
    title: 'Name the decision',
    description: 'Bring the question you keep circling, even if it is not perfectly formed yet.',
  },
  {
    icon: Search,
    title: 'Look for relevant overlap',
    description: 'Choose someone whose school, field, or path gives them useful firsthand context.',
  },
  {
    icon: Route,
    title: 'Leave with a next move',
    description: 'Use the conversation to uncover tradeoffs and decide what you want to do next.',
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
    question: 'What does “school email confirmed” mean?',
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

      <section className="field-notes border-foreground/20 relative overflow-hidden border-b-2">
        <div
          className="bg-primary pointer-events-none absolute top-0 right-[8%] hidden h-3 w-28 -rotate-2 lg:block"
          aria-hidden="true"
        />
        <div className="page-container grid gap-12 py-14 sm:py-18 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="note-stamp">Field note 01 · Find the overlap</p>
            <h1 className="display-title mt-7 max-w-3xl">
              What college <span className="marker-underline">decision</span> are you trying to
              make?
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
              Find a student who knows the school, major, or path you&apos;re weighing. Bring the
              question a search result cannot answer for your situation.
            </p>

            <div className="mt-8">
              <p className="text-foreground/55 text-xs font-bold tracking-[0.13em] uppercase">
                Notes students bring
              </p>
              <ItemGroup className="mt-3 gap-2.5">
                {decisionPrompts.map(prompt => (
                  <Item
                    key={prompt.question}
                    className="question-slip flex-nowrap px-3.5 py-3"
                    variant="outline"
                    size="sm"
                  >
                    <ItemMedia
                      variant="icon"
                      className="bg-accent text-foreground flex size-8 rounded-md"
                    >
                      <prompt.icon className="size-4" aria-hidden="true" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-foreground">“{prompt.question}”</ItemTitle>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </div>

            <Button
              render={<Link href="#mentors" />}
              nativeButton={false}
              size="lg"
              className="mt-8"
            >
              Find someone who&apos;s been there
              <ArrowDown />
            </Button>
          </div>

          <DiscoveryFilters
            schools={schools}
            majors={majors}
            gradYears={gradYears}
            searchParams={searchParams}
            hasFilters={hasFilters}
          />
        </div>
      </section>

      <section id="mentors" className="scroll-mt-20 border-b py-14 sm:py-18">
        <div className="page-container">
          <div>
            <p className="eyebrow">{hasFilters ? 'Closest matches' : 'Student mentors'}</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {hasFilters
                ? 'Students whose experience overlaps with your search'
                : 'Meet someone a few steps ahead'}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              Read what each person has lived through, then choose the perspective that fits the
              question in front of you.
            </p>
          </div>
          <div className="mt-7">
            <PostGrid
              schoolId={schoolId}
              majorId={majorId}
              graduationYear={graduationYear}
              initialPage={initialPage}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="field-notes scroll-mt-20 border-b py-14 sm:py-18">
        <div className="page-container grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="eyebrow">One useful conversation</p>
            <h2 className="mt-4 max-w-2xl text-4xl leading-[1.02] font-semibold tracking-[-0.035em] sm:text-5xl">
              From a question in your head to a next move you can own.
            </h2>
          </div>
          <ol className="paper-panel ink-shadow divide-foreground/15 divide-y overflow-hidden">
            {conversationSteps.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-4 p-5 sm:grid-cols-[4rem_2.5rem_1fr] sm:items-start sm:p-6"
              >
                <span
                  className="font-display text-primary text-4xl leading-none font-semibold"
                  aria-hidden="true"
                >
                  0{index + 1}
                </span>
                <span className="bg-accent text-foreground flex size-10 items-center justify-center rounded-md border">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
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
          <Accordion className="bg-card">
            {faqs.map(faq => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="p-5 text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground max-w-2xl px-1 text-sm leading-7">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="field-notes-ink on-ink border-background/10 border-y">
        <div className="page-container flex flex-col gap-8 py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16">
          <div>
            <p className="note-stamp">A note for someone a few steps ahead</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.035em]">
              Help someone else skip a few dead ends.
            </h2>
          </div>
          <Button
            render={<Link href="/for-mentors" />}
            nativeButton={false}
            size="lg"
            className="bg-highlight text-highlight-foreground hover:bg-highlight/90 shrink-0"
          >
            See how mentoring works
            <ArrowRight />
          </Button>
        </div>
      </section>
    </>
  )
}
