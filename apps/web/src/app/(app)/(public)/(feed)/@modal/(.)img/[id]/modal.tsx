'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'

type ModalProps = {
  children: React.ReactNode
}

export const Modal = ({ children }: ModalProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(true) // Open the modal when the component mounts
  }, [])

  const onDismiss = () => {
    setOpen(false) // Close the modal
    router.back() // Navigate back
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onDismiss()}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-[720px] overflow-hidden p-0 focus:outline-none sm:w-auto sm:rounded-xl">
        <DialogTitle className="sr-only">More Info</DialogTitle>
        <div className="[padding-bottom:env(safe-area-inset-bottom)]">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
