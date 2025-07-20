'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { deleteDateOverride } from '~/app/(default)/(dashboard)/scheduling/actions'
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
      try {
        const newOverrides = await deleteDateOverride(override.date)
        toast.success('Override deleted successfully!')
        onDelete(newOverrides)
      } catch (error) {
        toast.error('Failed to delete override. Please try again.')
        console.error(error)
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
