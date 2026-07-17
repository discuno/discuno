'use client'

import type { DateOverride } from '~/app/types/availability'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { formatDateKey } from './availability-utils'

interface DeleteOverrideDialogProps {
  isOpen: boolean
  onClose: () => void
  override: DateOverride | null
  onDelete: (date: string) => void
}

export function DeleteOverrideDialog({
  isOpen,
  onClose,
  override,
  onDelete,
}: DeleteOverrideDialogProps) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this date exception?</AlertDialogTitle>
          <AlertDialogDescription>
            {override
              ? `${formatDateKey(override.date, { dateStyle: 'full' })} will return to your usual weekly hours.`
              : 'This date will return to your usual weekly hours.'}{' '}
            Save availability afterward to publish the change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep exception</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={() => {
              if (override) onDelete(override.date)
              onClose()
            }}
          >
            Remove from draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
