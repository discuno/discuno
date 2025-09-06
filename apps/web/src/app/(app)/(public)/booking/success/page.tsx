import { CheckCircle, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const BookingSuccessPage = () => {
  return (
    <div className="flex min-h-[calc(100vh-var(--navbar-height))] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <CheckCircle className="text-primary h-6 w-6" />
          </div>
          <CardTitle>Booking Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Thank you for your booking. A confirmation email with the details of your appointment
            will be sent to you shortly.
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default BookingSuccessPage
