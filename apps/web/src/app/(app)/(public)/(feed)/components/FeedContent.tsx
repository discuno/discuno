import { Filter } from 'lucide-react'
import { PostGrid } from '~/app/(app)/(public)/(feed)/(post)/PostGrid'
import { FilterButton } from '~/app/(app)/(public)/(feed)/components/FilterButton'
import { Button } from '~/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { decodeUrlParam } from '~/lib/utils'
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

  const decodedSchool = decodeUrlParam(searchParams.school)
  const decodedMajor = decodeUrlParam(searchParams.major)
  const decodedGradYear = decodeUrlParam(searchParams.gradYear)

  const schoolId = decodedSchool ? (schools.find(s => s.value === decodedSchool)?.id ?? null) : null
  const majorId = decodedMajor ? (majors.find(m => m.value === decodedMajor)?.id ?? null) : null
  const graduationYear = decodedGradYear
    ? (gradYears.find(g => g.label === decodedGradYear)?.id ?? null)
    : null

  return (
    <>
      <div className="container mx-auto flex flex-col items-start justify-between gap-4 px-4 pt-24 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            Explore Mentors
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Connect with students from top universities.
          </p>
        </div>
      </div>

      {/* Smart Filter Bar */}
      {/*
        Container ensures matching margin with the header (px-4 mx-auto container).
        The component itself handles the transition to 'fixed' state.
      */}
      {/* Sticky Filter Bar */}
      {/* Sticks below the floating header when scrolling */}
      <div className="sticky top-20 z-40 flex justify-start px-4 sm:container sm:mx-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 hover:bg-background/90 shadow-lg backdrop-blur-xl transition-all duration-300"
            >
              <Filter className="ml-2 h-4 w-4" />
              <span className="mx-2">Filters</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/80 ml-2 w-80 p-4 shadow-xl backdrop-blur-xl"
            align="start"
            sideOffset={10}
          >
            <div className="space-y-4">
              <h2 className="text-foreground font-semibold">Filter Mentors</h2>
              <div className="flex flex-col gap-3">
                <FilterButton
                  filterItems={schools}
                  startValue={searchParams.school ?? ''}
                  queryName="school"
                  label="Select School..."
                />
                <FilterButton
                  filterItems={majors}
                  startValue={searchParams.major ?? ''}
                  queryName="major"
                  label="Select Major..."
                />
                <FilterButton
                  filterItems={gradYears}
                  startValue={searchParams.gradYear ?? ''}
                  queryName="gradYear"
                  label="Select Year..."
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Post Grid */}
      <div className="container mx-auto px-4 pb-12">
        <PostGrid schoolId={schoolId} majorId={majorId} graduationYear={graduationYear} />
      </div>
    </>
  )
}
