import { Skeleton } from '~/components/ui/skeleton'
import { Modal } from './modal'

const Loading = () => {
  return (
    <Modal>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-6 pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-6 py-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </Modal>
  )
}

export default Loading
