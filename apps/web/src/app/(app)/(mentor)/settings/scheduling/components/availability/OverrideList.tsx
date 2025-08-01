'use client'

import { useState } from 'react'
import type { Availability, DateOverride } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { DeleteOverrideDialog } from './DeleteOverrideDialog'
import { OverrideListItem } from './OverrideListItem'
import { SaveOverrideModal } from './SaveOverrideModal'

interface OverrideListProps {
  availability: Availability | null
  onOverridesChange: (newOverrides: DateOverride[]) => void
}

export function OverrideList({ availability, onOverridesChange }: OverrideListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOverride, setSelectedOverride] = useState<DateOverride | null>(null)
  const [overrideToDelete, setOverrideToDelete] = useState<DateOverride | null>(null)

  const handleCreate = () => {
    setSelectedOverride(null)
    setIsModalOpen(true)
  }

  const handleEdit = (override: DateOverride) => {
    setSelectedOverride(override)
    setIsModalOpen(true)
  }

  const handleDelete = (override: DateOverride) => {
    setOverrideToDelete(override)
    setIsDialogOpen(true)
  }

  const initialOverrides = availability?.dateOverrides ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your Overrides</h3>
        <Button onClick={handleCreate}>+ Create Override</Button>
      </div>
      <div className="rounded-md border">
        {initialOverrides.length > 0 ? (
          initialOverrides.map((override, index) => (
            <OverrideListItem
              key={`${override.date}-${index}`}
              override={override}
              onEdit={() => handleEdit(override)}
              onDelete={() => handleDelete(override)}
            />
          ))
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">You have no date overrides.</div>
        )}
      </div>
      <SaveOverrideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        overrideToEdit={selectedOverride}
        currentAvailability={availability}
        onSave={(newOverrides: DateOverride[]) => {
          onOverridesChange(newOverrides)
          setIsModalOpen(false)
        }}
      />
      <DeleteOverrideDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        override={overrideToDelete}
        onDelete={(newOverrides: DateOverride[]) => {
          onOverridesChange(newOverrides)
          setIsDialogOpen(false)
        }}
      />
    </div>
  )
}
