'use client'

import Link from 'next/link'
import { BookOpen, CalendarDays, GraduationCap } from 'lucide-react'
import { buttonVariants } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { FilterButton, type FilterValue } from './FilterButton'

interface DiscoveryFiltersProps {
  schools: FilterValue[]
  majors: FilterValue[]
  gradYears: FilterValue[]
  searchParams: {
    school?: string
    major?: string
    gradYear?: string
  }
  hasFilters: boolean
}

export function DiscoveryFilters({
  schools,
  majors,
  gradYears,
  searchParams,
  hasFilters,
}: DiscoveryFiltersProps) {
  return (
    <section className="border-b" aria-labelledby="discovery-filters-title">
      <div className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)] lg:items-end lg:gap-10">
          <div>
            <h2 id="discovery-filters-title" className="text-lg font-semibold">
              Find the closest overlap
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Choose a school, field, or graduation year.
            </p>
          </div>

          <div
            className="grid gap-3 sm:grid-cols-3"
            role="group"
            aria-label="Mentor search filters"
          >
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">School</p>
              <FilterButton
                filterItems={schools}
                startValue={searchParams.school ?? ''}
                queryName="school"
                label="School or university"
                icon={GraduationCap}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">Field</p>
              <FilterButton
                filterItems={majors}
                startValue={searchParams.major ?? ''}
                queryName="major"
                label="Major or field of study"
                icon={BookOpen}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">Graduation year</p>
              <FilterButton
                filterItems={gradYears}
                startValue={searchParams.gradYear ?? ''}
                queryName="gradYear"
                label="Graduation year"
                icon={CalendarDays}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex min-h-9 items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs leading-5">
            {hasFilters
              ? 'Results below reflect your current filters.'
              : 'No account is needed to browse or book.'}
          </p>
          {hasFilters && (
            <Link
              href="/find#mentors"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0')}
            >
              Clear filters
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
