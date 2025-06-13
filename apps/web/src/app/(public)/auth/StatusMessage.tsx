import { CheckCircle, AlertCircle, XCircle, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '~/components/ui/alert'

interface StatusMessageProps {
  status?: 'success' | 'error' | 'already-registered' | 'invalid-email'
}

export function StatusMessage({ status }: StatusMessageProps) {
  if (!status) {
    return null
  }

  const configs = {
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      title: 'Welcome to the waitlist!',
      description: "We'll notify you as soon as Discuno launches. Check your email for confirmation.",
      className:
        'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
    },
    'already-registered': {
      icon: <Mail className="h-5 w-5" />,
      title: "You're already on the list!",
      description: "This email is already registered. We'll notify you when we launch.",
      className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    },
    'invalid-email': {
      icon: <AlertCircle className="h-5 w-5" />,
      title: 'Invalid email address',
      description: 'Please enter a valid email address to join our waitlist.',
      className:
        'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200',
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      title: 'Something went wrong',
      description: "We couldn't add you to the waitlist right now. Please try again.",
      className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    },
  }

  const config = configs[status]

  return (
    <div className="mx-auto mb-8 max-w-md">
      <Alert className={config.className}>
        <div className="flex items-start gap-3">
          {config.icon}
          <div>
            <AlertDescription className="font-semibold">{config.title}</AlertDescription>
            <AlertDescription className="mt-1 opacity-90">{config.description}</AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  )
}
