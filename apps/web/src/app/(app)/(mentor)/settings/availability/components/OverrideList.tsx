'use client'

import { CalendarPlus } from 'lucide-react'
import { Fragment, useState } from 'react'

import type { Availability, DateOverride } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '~/components/ui/empty'
import { ItemGroup } from '~/components/ui/item'
import { Separator } from '~/components/ui/separator'

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
        size="sm"
        className="self-start"
        onClick={() => {
          setSelectedOverride(null)
          setIsModalOpen(true)
        }}
      >
        <CalendarPlus data-icon="inline-start" />
        Add dates
      </Button>

      <Separator />

      {overrides.length > 0 ? (
        <ItemGroup className="gap-0">
          {overrides.map((override, index) => (
            <Fragment key={override.date}>
              <OverrideListItem
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
              {index < overrides.length - 1 && <Separator />}
            </Fragment>
          ))}
        </ItemGroup>
      ) : (
        <Empty className="py-10 md:py-12">
          <EmptyHeader>
            <EmptyTitle>No date exceptions</EmptyTitle>
            <EmptyDescription>Your usual week applies to every date.</EmptyDescription>
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
