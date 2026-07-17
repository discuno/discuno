'use client'

import { CalendarPlus, Plus } from 'lucide-react'
import { useState } from 'react'
import type { Availability, DateOverride } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '~/components/ui/empty'
import { ItemGroup } from '~/components/ui/item'
import { DeleteOverrideDialog } from './DeleteOverrideDialog'
import { OverrideListItem } from './OverrideListItem'
import { SaveOverrideModal } from './SaveOverrideModal'

interface OverrideListProps {
  availability: Availability
  onOverridesChange: (newOverrides: DateOverride[]) => void
}

export function OverrideList({ availability, onOverridesChange }: OverrideListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOverride, setSelectedOverride] = useState<DateOverride | null>(null)
  const [overrideToDelete, setOverrideToDelete] = useState<DateOverride | null>(null)

  const overrides = [...availability.dateOverrides].sort((left, right) =>
    left.date.localeCompare(right.date)
  )

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          setSelectedOverride(null)
          setIsModalOpen(true)
        }}
      >
        <Plus data-icon="inline-start" />
        Add dates
      </Button>

      {overrides.length > 0 ? (
        <ItemGroup className="gap-2.5">
          {overrides.map(override => (
            <OverrideListItem
              key={override.date}
              override={override}
              onEdit={() => {
                setSelectedOverride(override)
                setIsModalOpen(true)
              }}
              onDelete={() => {
                setOverrideToDelete(override)
                setIsDialogOpen(true)
              }}
            />
          ))}
        </ItemGroup>
      ) : (
        <Empty className="bg-muted/25 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlus />
            </EmptyMedia>
            <EmptyTitle>No date exceptions</EmptyTitle>
            <EmptyDescription>
              Set different hours for a specific date without changing your usual week.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {isModalOpen && (
        <SaveOverrideModal
          isOpen
          onClose={() => {
            setIsModalOpen(false)
            setSelectedOverride(null)
          }}
          overrideToEdit={selectedOverride}
          currentAvailability={availability}
          onSave={onOverridesChange}
        />
      )}
      {isDialogOpen && (
        <DeleteOverrideDialog
          isOpen
          onClose={() => {
            setIsDialogOpen(false)
            setOverrideToDelete(null)
          }}
          override={overrideToDelete}
          onDelete={date => onOverridesChange(overrides.filter(override => override.date !== date))}
        />
      )}
    </div>
  )
}
