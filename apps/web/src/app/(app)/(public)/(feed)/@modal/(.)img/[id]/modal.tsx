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
      <DialogContent className="h-[680px] max-h-[85vh] w-[720px] max-w-[90vw] overflow-hidden p-0 focus:outline-none">
        <DialogTitle className="sr-only">More Info</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}
