import { Check, Mail } from 'lucide-react'

export const BookingConfirmationStep = () => {
  return (
    <div
      className="flex min-h-[32rem] flex-col items-center justify-center px-6 py-12 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="border-success/25 bg-success/10 text-success flex size-12 items-center justify-center rounded-full border [&_svg]:size-5">
        <Check aria-hidden="true" />
      </div>
      <h2
        data-booking-step-heading
        tabIndex={-1}
        className="mt-5 text-2xl font-semibold tracking-tight outline-none"
      >
        Session confirmed
      </h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
        The session details and calendar invitation are on their way to your email.
      </p>
      <p className="text-muted-foreground mt-5 flex items-center gap-2 text-xs">
        <Mail aria-hidden="true" className="size-4" />
        Check your spam folder if the email does not arrive within a few minutes.
      </p>
    </div>
  )
}
