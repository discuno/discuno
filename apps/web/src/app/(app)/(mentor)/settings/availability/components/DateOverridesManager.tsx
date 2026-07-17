'use client'

import { CalendarRange } from 'lucide-react'
import type { Availability, DateOverride } from '~/app/types/availability'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
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
    <Card className="overflow-hidden">
      <CardHeader className="border-border/70 border-b">
        <div className="flex gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <CalendarRange className="size-5" />
          </div>
          <div>
            <CardTitle>Date exceptions</CardTitle>
            <CardDescription className="mt-1">
              Use different hours on a specific date. For a full day off, block the day on your
              connected calendar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <OverrideList availability={availability} onOverridesChange={onOverridesChange} />
      </CardContent>
    </Card>
  )
}
