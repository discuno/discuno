'use client'

import { BookOpen, CalendarDays, GraduationCap, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { FilterButton, type FilterValue } from '~/app/(app)/(public)/(feed)/components/FilterButton'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import { Field, FieldGroup, FieldTitle } from '~/components/ui/field'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { cn } from '~/lib/utils'

interface FindFiltersProps {
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

function FilterFields({
  schools,
  majors,
  gradYears,
  searchParams,
}: Omit<FindFiltersProps, 'hasFilters'>) {
  return (
    <FieldGroup className="gap-5">
      <Field className="gap-2">
        <FieldTitle>School</FieldTitle>
        <FilterButton
          filterItems={schools}
          startValue={searchParams.school ?? ''}
          queryName="school"
          label="School or university"
          icon={GraduationCap}
        />
      </Field>

      <Field className="gap-2">
        <FieldTitle>Field</FieldTitle>
        <FilterButton
          filterItems={majors}
          startValue={searchParams.major ?? ''}
          queryName="major"
          label="Major or field of study"
          icon={BookOpen}
        />
      </Field>

      <Field className="gap-2">
        <FieldTitle>Graduation year</FieldTitle>
        <FilterButton
          filterItems={gradYears}
          startValue={searchParams.gradYear ?? ''}
          queryName="gradYear"
          label="Graduation year"
          icon={CalendarDays}
        />
      </Field>
    </FieldGroup>
  )
}

export function FindFilters({
  schools,
  majors,
  gradYears,
  searchParams,
  hasFilters,
}: FindFiltersProps) {
  const activeFilterCount = [searchParams.school, searchParams.major, searchParams.gradYear].filter(
    Boolean
  ).length
  const filterFields = {
    schools,
    majors,
    gradYears,
    searchParams,
  }

  return (
    <>
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-label="Refine mentor results"
              />
            }
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
              Filters
            </span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
              </Badge>
            )}
          </SheetTrigger>

          <SheetContent side="bottom" className="max-h-[85dvh] overflow-hidden rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Filter mentors</SheetTitle>
              <SheetDescription>School, field, or graduation year.</SheetDescription>
            </SheetHeader>

            <div className="min-h-0 overflow-y-auto px-6 pb-6">
              <FilterFields {...filterFields} />
              {hasFilters && (
                <Link
                  href="/find#mentors"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-5')}
                >
                  Clear filters
                </Link>
              )}
            </div>

            <SheetFooter>
              <SheetClose render={<Button className="w-full" />}>Show results</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden border-r pr-8 lg:block" aria-labelledby="find-filters-title">
        <div className="sticky top-24">
          <h2 id="find-filters-title" className="text-lg font-semibold">
            Filters
          </h2>

          <div className="mt-5">
            <FilterFields {...filterFields} />
          </div>

          {hasFilters && (
            <Link
              href="/find#mentors"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-5 -ml-3')}
            >
              Clear filters
            </Link>
          )}

          <p className="text-muted-foreground mt-8 border-t pt-5 text-xs leading-5">
            Published profile details only. No account needed to browse.
          </p>
        </div>
      </aside>
    </>
  )
}
