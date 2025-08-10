'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Skeleton } from '~/components/ui/skeleton'

export default function PostModalLoading() {
  return (
    <Dialog open>
      <DialogContent className="p-0 focus:outline-none">
        <DialogTitle>Loading Profile...</DialogTitle>
        <DialogDescription>Please wait while we load the mentor&apos;s profile.</DialogDescription>
        <div className="mt-4 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
