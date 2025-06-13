'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogClose, DialogTitle } from '~/components/ui/dialog'
import { DialogDescription } from '@radix-ui/react-dialog'
import Link from 'next/link'

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
      <DialogContent>
        <DialogTitle>More Info</DialogTitle>
        <DialogDescription>
          <Link href="/docs/primitives/alert-dialog">Dashboard</Link>
        </DialogDescription>
        {children}
        <DialogClose asChild>
          <button onClick={onDismiss} className="close-button" aria-label="Close" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
