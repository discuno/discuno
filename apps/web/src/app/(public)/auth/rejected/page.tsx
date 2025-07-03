import { AlertTriangle, ArrowLeft, GraduationCap, Mail, Shield } from 'lucide-react'
import Link from 'next/link'
import { IconLogo } from '~/components/icons/IconLogo'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const AuthRejectedPage = () => {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-border/40 border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <IconLogo size={32} className="text-gray-900 dark:text-white" />
            <h1 className="text-foreground text-xl font-bold">Discuno</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Error Badge */}
          <Badge variant="destructive" className="mb-8 inline-flex items-center gap-2 px-4 py-2">
            <AlertTriangle className="h-4 w-4" />
            Access Denied
          </Badge>

          {/* Main Error Card */}
          <Card className="border-destructive/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Shield className="text-destructive h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Educational Email Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-lg leading-relaxed">
                Discuno is exclusively for current college students and recent graduates. To
                maintain the quality and authenticity of our mentor network, we only accept sign-ups
                with verified educational email addresses.
              </p>

              {/* Requirements */}
              <div className="space-y-4">
                <h3 className="text-foreground font-semibold">To access Discuno, you need:</h3>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground font-medium">Educational Email Address</p>
                      <p className="text-muted-foreground text-sm">
                        A valid .edu email address from your university
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground font-medium">Current Student Status</p>
                      <p className="text-muted-foreground text-sm">
                        Be enrolled or recently graduated from an accredited university
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground mb-2 text-sm font-medium">
                  Valid email examples:
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground font-mono">john.doe@university.edu</p>
                  <p className="text-foreground font-mono">student@college.edu</p>
                  <p className="text-foreground font-mono">mentor@school.edu</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild variant="default">
                  <Link href="/auth" className="flex items-center gap-2">
                    Try Again with .edu Email
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>

              {/* Additional Help */}
              <div className="border-border/50 border-t pt-6">
                <p className="text-muted-foreground text-sm">
                  Don&apos;t have a .edu email? Join our{' '}
                  <Link href="/auth" className="text-primary underline-offset-4 hover:underline">
                    waitlist
                  </Link>{' '}
                  to be notified when we expand access.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AuthRejectedPage
