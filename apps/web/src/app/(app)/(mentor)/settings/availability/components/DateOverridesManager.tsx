'use client'

import type { Availability, DateOverride } from '~/app/types/availability'

import { OverrideList } from './OverrideList'

interface DateOverridesManagerProps {
  availability: Availability
  onOverridesChange: (overrides: DateOverride[]) => void
}

export function DateOverridesManager({
  availability,
  onOverridesChange,
}: DateOverridesManagerProps) {
  return (
    <section
      className="border-border flex flex-col gap-5 border-y py-6"
      aria-labelledby="date-exceptions-heading"
    >
      <header className="flex max-w-2xl flex-col gap-1">
        <h2 id="date-exceptions-heading" className="text-lg font-semibold">
          Date exceptions
        </h2>
        <p className="text-muted-foreground text-sm leading-6">
          Replace your usual hours on specific dates. Block full days in your connected calendar.
        </p>
      </header>
      <OverrideList availability={availability} onOverridesChange={onOverridesChange} />
    </section>
  )
}
