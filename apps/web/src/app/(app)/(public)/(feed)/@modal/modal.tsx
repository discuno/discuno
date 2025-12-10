'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

interface ModalProps {
  children: ReactNode
  footer?: ReactNode
  title?: string
}

export function Modal({ children, footer, title }: ModalProps) {
  const router = useRouter()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.back()
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        {title && (
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        {footer && <DialogFooter className="shrink-0 px-6 pb-6">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
