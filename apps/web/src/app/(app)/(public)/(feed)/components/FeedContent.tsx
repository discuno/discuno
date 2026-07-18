import { ArrowDown, ArrowRight, MessageCircleQuestion, Route, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { PostGrid } from '~/app/(app)/(public)/(feed)/(post)/PostGrid'
import { DiscoveryFilters } from '~/app/(app)/(public)/(feed)/components/DiscoveryFilters'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { buttonVariants } from '~/components/ui/button'
import { siteConfig } from '~/lib/metadata'
import { cn, decodeUrlParam } from '~/lib/utils'
import { getInfiniteScrollPosts, getPostsByFilters } from '~/server/queries/posts'
import { getMajors, getSchools } from '~/server/queries/reference-data'

interface FeedContentProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

const decisionPrompts = [
  {
    topic: 'Major',
    question: 'Is this major right for the work I want to do?',
  },
  {
    topic: 'Internship',
    question: 'What actually helped you land your first internship?',
  },
  {
    topic: 'Direction',
    question: 'Should I switch paths or give this more time?',
  },
  {
    topic: 'Campus',
    question: 'Which opportunities are worth making room for?',
  },
]

const conversationSteps = [
  {
    icon: MessageCircleQuestion,
    title: 'Name the decision',
    description: 'Bring the question you keep circling. It does not need to be perfectly formed.',
  },
  {
    icon: Search,
    title: 'Hear relevant firsthand context',
    description:
      'Ask someone whose school, field, or path overlaps with the choice in front of you.',
  },
  {
    icon: Route,
    title: 'Choose your next move',
    description: 'Leave with fewer unknowns, better questions, and one action you can take next.',
  },
]

const faqs = [
  {
    question: 'What can I talk through with a mentor?',
    answer:
      'Bring a specific course, major, internship, recruiting, campus, graduate school, or change-of-direction question. A mentor shares firsthand context. Official academic, financial, legal, and medical decisions still belong with the right professional.',
  },
  {
    question: 'How do I choose the right person?',
    answer:
      'Look for the overlap that matters to your question, such as the same school, field, recruiting path, or decision. Then read the mentor’s own profile and session options.',
  },
  {
    question: 'What does “school email confirmed” mean?',
    answer:
      'It means the mentor demonstrated access to a supported institutional email address. It supports the school affiliation shown on the profile. It does not verify identity, background, expertise, credentials, or outcomes.',
  },
  {
    question: 'What will a session cost?',
    answer:
      'Mentors choose whether a session is free or paid. You will see its duration and listed price before choosing a time, plus any applicable tax before paid checkout is complete.',
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

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-[76rem] gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-16">
          <div className="public-enter max-w-[42rem]">
            <p className="text-primary text-sm font-semibold">
              Student-to-student guidance for college decisions
            </p>
            <h1 className="display-hero mt-4">
              What are you <span className="marker-highlight">trying to decide?</span>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8 sm:text-xl">
              Find a student with relevant firsthand context, ask what search cannot answer, and
              choose your next move.
            </p>
            <Link href="#mentors" className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}>
              Find a mentor
              <ArrowDown data-icon="inline-end" />
            </Link>
          </div>

          <div className="public-enter-delayed bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:aspect-[7/6]">
            <Image
              src="/images/hero-conversation.png"
              alt="Two students talk through a question at a library table"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 56vw"
            />
          </div>
        </div>
      </section>

      <DiscoveryFilters
        schools={schools}
        majors={majors}
        gradYears={gradYears}
        searchParams={searchParams}
        hasFilters={hasFilters}
      />

      <section id="mentors" className="scroll-mt-20 py-14 sm:py-18">
        <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-8">
          <div className="max-w-[42rem]">
            <h2 className="font-display text-4xl leading-tight font-semibold tracking-[-0.035em] sm:text-5xl">
              {hasFilters ? 'Students matched to your search' : 'Meet someone a few steps ahead'}
            </h2>
            <p className="text-muted-foreground mt-3 text-base leading-7 sm:text-lg">
              {hasFilters
                ? 'Compare the school, field, and firsthand context behind each match.'
                : 'Start with the person whose experience is closest to your question.'}
            </p>
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

      <section className="bg-muted/35 border-y py-14 sm:py-18">
        <div className="mx-auto grid w-full max-w-[76rem] gap-9 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8">
          <div className="max-w-[32rem]">
            <h2 className="font-display text-4xl leading-tight font-semibold tracking-[-0.035em]">
              A question is enough to start.
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              It can be about one course, an internship, or whether to change direction.
            </p>
          </div>

          <ul className="divide-border border-y">
            {decisionPrompts.map(prompt => (
              <li
                key={prompt.question}
                className="grid gap-2 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-baseline"
              >
                <span className="text-muted-foreground text-sm font-medium">{prompt.topic}</span>
                <p className="font-display text-xl leading-7 font-medium">“{prompt.question}”</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 py-14 sm:py-18">
        <div className="mx-auto grid w-full max-w-[76rem] gap-9 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8">
          <div className="max-w-[34rem]">
            <h2 className="font-display text-4xl leading-tight font-semibold tracking-[-0.035em] sm:text-5xl">
              A useful conversation changes what you do next.
            </h2>
            <p className="text-muted-foreground mt-3 leading-7">
              You bring the decision. Your mentor brings context you can test against your own
              situation.
            </p>
          </div>

          <ol className="divide-border border-y">
            {conversationSteps.map(step => (
              <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 py-6">
                <step.icon className="text-primary mt-1 size-5" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-1 max-w-xl leading-7">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t py-14 sm:py-18">
        <div className="mx-auto grid w-full max-w-[76rem] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-8">
          <h2 className="font-display max-w-md text-4xl leading-tight font-semibold tracking-[-0.035em]">
            A few things to know before you book
          </h2>
          <Accordion className="border-t">
            {faqs.map(faq => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground max-w-2xl leading-7">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-t py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-[76rem] flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-[42rem]">
            <h2 className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
              You have lived a question another student is asking.
            </h2>
            <p className="text-muted-foreground mt-2 leading-7">
              Share what you learned in one focused conversation, on a schedule you control.
            </p>
          </div>
          <Link href="/for-mentors" className={cn(buttonVariants({ size: 'lg' }), 'shrink-0')}>
            Start mentoring
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </section>
    </>
  )
}
