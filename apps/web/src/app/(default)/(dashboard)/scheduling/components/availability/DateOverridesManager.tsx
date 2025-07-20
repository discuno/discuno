'use client'

import type { DateOverride } from '~/app/types/availability'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { OverrideList } from './OverrideList'

interface DateOverridesManagerProps {
  overrides: DateOverride[]
  onOverridesChange: (overrides: DateOverride[]) => void
}

export function DateOverridesManager({ overrides, onOverridesChange }: DateOverridesManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Overrides</CardTitle>
        <CardDescription>
          Add or remove specific dates to override your weekly hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OverrideList initialOverrides={overrides} onOverridesChange={onOverridesChange} />
      </CardContent>
    </Card>
  )
}
