'use client'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'

type ModalProps = {
  children: React.ReactNode
  footer?: React.ReactNode
}

export const Modal = ({ children, footer }: ModalProps) => {
  const router = useRouter()
  // Modal opens immediately on mount (no need for useEffect)
  const onDismiss = () => {
    router.back()
  }

  return (
    <Dialog open={true} onOpenChange={isOpen => !isOpen && onDismiss()}>
      <DialogContent className="max-h-[85vh] w-full max-w-[85vw] overflow-hidden p-0 focus:outline-none sm:rounded-xl md:max-w-lg">
        <DialogTitle className="sr-only">Mentor Profile</DialogTitle>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex-1 overflow-hidden [padding-bottom:env(safe-area-inset-bottom)]">
            {children}
          </div>
          {footer && (
            <div className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 z-10 border-t px-4 py-3 backdrop-blur sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
