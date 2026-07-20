'use client'

import { Link2Off } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { disconnectCalcomAccount } from './actions'

function DisconnectActions() {
  const { pending } = useFormStatus()

  return (
    <>
      <AlertDialogCancel type="button" disabled={pending}>
        Keep connected
      </AlertDialogCancel>
      <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? 'Disconnecting…' : 'Disconnect calendar'}
      </AlertDialogAction>
    </>
  )
}

export function DisconnectCalendarButton({ disabled }: { disabled: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={disabled}
          />
        }
      >
        <Link2Off data-icon="inline-start" aria-hidden="true" />
        Disconnect
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Link2Off aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Disconnect this calendar?</AlertDialogTitle>
          <AlertDialogDescription>
            Students will no longer be able to book you, and synced session types will be paused.
            You can reconnect this same account later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={disconnectCalcomAccount}>
          <AlertDialogFooter>
            <DisconnectActions />
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
