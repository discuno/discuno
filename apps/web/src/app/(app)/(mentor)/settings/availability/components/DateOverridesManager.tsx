'use client'

import type { Availability, DateOverride } from '~/app/types/availability'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { OverrideList } from './OverrideList'

interface DateOverridesManagerProps {
  availability: Availability | null
  onOverridesChange: (overrides: DateOverride[]) => void
}

export function DateOverridesManager({
  availability,
  onOverridesChange,
}: DateOverridesManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Overrides</CardTitle>
        <CardDescription>
          Add or remove specific dates to override your weekly hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OverrideList availability={availability} onOverridesChange={onOverridesChange} />
      </CardContent>
    </Card>
  )
}
