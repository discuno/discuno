'use client'

import { BookOpen, CalendarDays, GraduationCap, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { FilterButton, type FilterValue } from './FilterButton'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'

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
    <Card className="stacked-note corner-mark paper-panel ink-shadow p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="note-stamp gap-1.5">
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Decision worksheet
          </p>
          <h2 className="mt-5 text-3xl leading-[1.05] font-semibold tracking-tight">
            Start with what matters to your decision
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            School and field usually matter most. Add a graduation year only when the stage of the
            journey matters too.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <FilterButton
          filterItems={schools}
          startValue={searchParams.school ?? ''}
          queryName="school"
          label="School or university"
          icon={GraduationCap}
        />
        <FilterButton
          filterItems={majors}
          startValue={searchParams.major ?? ''}
          queryName="major"
          label="Major or field of study"
          icon={BookOpen}
        />
        <FilterButton
          filterItems={gradYears}
          startValue={searchParams.gradYear ?? ''}
          queryName="gradYear"
          label="Graduation year (optional)"
          icon={CalendarDays}
        />
      </div>

      <div className="ledger-rule mt-5 flex min-h-9 items-center justify-between gap-4 pt-4">
        <p className="text-muted-foreground text-xs leading-5">
          {hasFilters
            ? 'Your choices are reflected in the results below.'
            : 'No account needed to browse profiles or book.'}
        </p>
        {hasFilters && (
          <Button
            render={<Link href="/#mentors" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            Clear all
          </Button>
        )}
      </div>
    </Card>
  )
}
