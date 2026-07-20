import { PostGrid } from '~/app/(app)/(public)/(feed)/(post)/PostGrid'
import { createDiscoveryReturnHref } from '~/lib/discovery-return'
import { siteConfig } from '~/lib/metadata'
import { decodeUrlParam } from '~/lib/utils'
import { getInfiniteScrollPosts, getPostsByFilters } from '~/server/queries/posts'
import { getMajors, getSchools } from '~/server/queries/reference-data'
import { FindFilters } from './FindFilters'

export interface FindSearchParams {
  school?: string
  major?: string
  gradYear?: string
}

interface FindResultsProps {
  searchParams: FindSearchParams
}

const MENTOR_PAGE_SIZE = 6

export async function FindResults({ searchParams }: FindResultsProps) {
  const [schools, majors] = await Promise.all([getSchools(), getMajors()])
  const currentYear = new Date().getFullYear()
  const gradYears = Array.from({ length: 7 }, (_, index) => {
    const year = currentYear - 1 + index
    return { id: year, value: year.toString(), label: year.toString() }
  })

  const selectedSchool = schools.find(
    school => school.value === decodeUrlParam(searchParams.school)
  )
  const selectedMajor = majors.find(major => major.value === decodeUrlParam(searchParams.major))
  const selectedGradYear = gradYears.find(
    year => year.value === decodeUrlParam(searchParams.gradYear)
  )

  const schoolId = selectedSchool?.id ?? null
  const majorId = selectedMajor?.id ?? null
  const graduationYear = selectedGradYear?.id ?? null
  const hasFilters = schoolId !== null || majorId !== null || graduationYear !== null
  const normalizedSearchParams = {
    school: selectedSchool?.value,
    major: selectedMajor?.value,
    gradYear: selectedGradYear?.value,
  }
  const discoveryReturnHref = createDiscoveryReturnHref(normalizedSearchParams)

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

      <section
        id="mentors"
        className="scroll-mt-20 py-10 sm:py-14"
        aria-labelledby="mentor-results-title"
      >
        <div className="mx-auto w-full max-w-[76rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
            <FindFilters
              schools={schools}
              majors={majors}
              gradYears={gradYears}
              searchParams={normalizedSearchParams}
              hasFilters={hasFilters}
            />

            <div className="min-w-0">
              <div className="mb-7 max-w-[42rem]">
                <h2
                  id="mentor-results-title"
                  className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl"
                >
                  {hasFilters ? 'Students within these filters' : 'All student mentors'}
                </h2>
                <p className="text-muted-foreground mt-2 leading-7">
                  {hasFilters
                    ? 'Filtered only by the profile details you selected.'
                    : 'Choose whose experience best fits the question you brought.'}
                </p>
              </div>

              <PostGrid
                schoolId={schoolId}
                majorId={majorId}
                graduationYear={graduationYear}
                initialPage={initialPage}
                discoveryReturnHref={discoveryReturnHref}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
