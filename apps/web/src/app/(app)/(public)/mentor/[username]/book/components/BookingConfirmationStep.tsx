import { Check, Mail } from 'lucide-react'

export const BookingConfirmationStep = () => {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-6 py-12 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="bg-highlight text-highlight-foreground mb-6 flex h-14 w-14 items-center justify-center rounded-md border shadow-[2px_2px_0_rgba(13,20,39,0.14)]">
        <Check className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <p className="text-primary mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
        Confirmed
      </p>
      <h2
        data-booking-step-heading
        tabIndex={-1}
        className="text-foreground text-2xl font-semibold tracking-tight outline-none"
      >
        You’re booked
      </h2>
      <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-6">
        We sent the session details and calendar invitation to your email.
      </p>
      <div className="bg-muted/50 text-muted-foreground mt-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
        <Mail className="h-4 w-4" />
        Check your spam folder if it doesn’t arrive within a few minutes.
      </div>
    </div>
  )
}
