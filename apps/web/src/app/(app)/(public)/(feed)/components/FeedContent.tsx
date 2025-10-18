import { Filter } from 'lucide-react'
import { PostGrid } from '~/app/(app)/(public)/(feed)/(post)/PostGrid'
import { FilterButton } from '~/app/(app)/(public)/(feed)/components/FilterButton'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { getMajors, getSchools } from '~/server/queries/reference-data'

interface FeedContentProps {
  searchParams: { school?: string; major?: string; gradYear?: string }
}

export const FeedContent = async ({ searchParams }: FeedContentProps) => {
  const schools = await getSchools()
  const majors = await getMajors()
  const gradYears: {
    value: string
    label: string
    id: number
  }[] = Array.from({ length: 6 }, (_, i) => {
    const year = 2025 + i
    return {
      id: year,
      value: year.toString(),
      label: year.toString(),
    }
  })

  const schoolId = searchParams.school
    ? (schools.find(s => s.value === searchParams.school)?.id ?? null)
    : null
  const majorId = searchParams.major
    ? (majors.find(m => m.label === searchParams.major)?.id ?? null)
    : null
  const graduationYear = searchParams.gradYear
    ? (gradYears.find(g => g.label === searchParams.gradYear)?.id ?? null)
    : null

  return (
    <>
      {/* Filter Popover */}
      <div className="sticky top-[80px] z-10 flex justify-start px-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border/70 bg-background/60 shadow-lg backdrop-blur-md transition-colors duration-300"
            >
              <Filter className="ml-2 h-4 w-4" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="border/40 bg-background/60 ml-2 w-80 p-4 shadow-lg backdrop-blur-md"
            align="end"
          >
            <div className="space-y-4">
              <h2 className="text-foreground font-semibold">Filter Mentors</h2>
              <div className="flex flex-col gap-3">
                <FilterButton
                  filterItems={schools}
                  startValue={searchParams.school ?? ''}
                  queryName="school"
                  aria-label="Filter by school"
                />
                <FilterButton
                  filterItems={majors}
                  startValue={searchParams.major ?? ''}
                  queryName="major"
                  aria-label="Filter by major"
                />
                <FilterButton
                  filterItems={gradYears}
                  startValue={searchParams.gradYear ?? ''}
                  queryName="gradYear"
                  aria-label="Filter by graduation year"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Post Grid */}
      <PostGrid schoolId={schoolId} majorId={majorId} graduationYear={graduationYear} />
    </>
  )
}
