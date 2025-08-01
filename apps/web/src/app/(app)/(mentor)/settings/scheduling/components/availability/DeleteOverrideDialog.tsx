'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { deleteDateOverride } from '~/app/(app)/(mentor)/settings/scheduling/actions'
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

interface DeleteOverrideDialogProps {
  isOpen: boolean
  onClose: () => void
  override: DateOverride | null
  onDelete: (newOverrides: DateOverride[]) => void
}

export function DeleteOverrideDialog({
  isOpen,
  onClose,
  override,
  onDelete,
}: DeleteOverrideDialogProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!override) return

    startTransition(async () => {
      const result = await deleteDateOverride(override.date)
      if (result.success && result.data) {
        toast.success('Override deleted successfully!')
        onDelete(result.data)
        onClose()
      } else {
        toast.error(`Failed to delete override: ${result.error ?? 'Unknown error'}`)
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the override for{' '}
            {override
              ? new Date(override.date + 'T00:00:00').toLocaleDateString(undefined, {
                  dateStyle: 'full',
                })
              : ''}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
