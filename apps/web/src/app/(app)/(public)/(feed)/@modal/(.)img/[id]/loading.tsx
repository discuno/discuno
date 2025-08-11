'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Skeleton } from '~/components/ui/skeleton'

export default function PostModalLoading() {
  return (
    <Dialog open>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-[720px] overflow-hidden p-0 focus:outline-none sm:w-auto sm:rounded-xl">
        <DialogTitle className="sr-only">Loading Profile...</DialogTitle>
        <DialogDescription className="sr-only">
          Please wait while we load the mentor&apos;s profile.
        </DialogDescription>
        <div className="space-y-4 p-6">
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
          <div className="flex flex-row gap-2 pt-1">
            <Skeleton className="h-10 w-1/2 rounded-md" />
            <Skeleton className="h-10 w-1/2 rounded-md" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
