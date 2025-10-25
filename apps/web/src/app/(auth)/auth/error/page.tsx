import { AlertCircle, ArrowLeft, Calendar, Globe, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { IconLogo } from '~/components/icons/IconLogo'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

// Component to handle search params
const ErrorContent = ({ searchParams }: { searchParams: { type?: string; error?: string } }) => {
  const isCalcomError = searchParams.type === 'calcom'
  const isOAuthAccountNotLinked = searchParams.error === 'OAuthAccountNotLinked'
  const isVerificationError = searchParams.error === 'Verification'

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
          <Badge
            variant={isOAuthAccountNotLinked || isVerificationError ? 'secondary' : 'destructive'}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2"
          >
            {isOAuthAccountNotLinked ? (
              <Users className="h-4 w-4" />
            ) : isCalcomError ? (
              <Calendar className="h-4 w-4" />
            ) : isVerificationError ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {isOAuthAccountNotLinked
              ? 'Account Linking Error'
              : isCalcomError
                ? 'Scheduling Service Error'
                : isVerificationError
                  ? 'Link Expired'
                  : 'Authentication Error'}
          </Badge>

          {/* Main Error Card */}
          <Card
            className={`${isOAuthAccountNotLinked || isVerificationError ? 'border-secondary/20' : 'border-destructive/20'} bg-card/50 backdrop-blur-sm`}
          >
            <CardHeader>
              <div
                className={`${isOAuthAccountNotLinked || isVerificationError ? 'bg-secondary/10' : 'bg-destructive/10'} mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full`}
              >
                {isOAuthAccountNotLinked ? (
                  <Users className="text-secondary h-8 w-8" />
                ) : isCalcomError ? (
                  <Calendar className="text-destructive h-8 w-8" />
                ) : isVerificationError ? (
                  <AlertCircle className="text-secondary h-8 w-8" />
                ) : (
                  <AlertCircle className="text-destructive h-8 w-8" />
                )}
              </div>
              <CardTitle className="text-2xl font-bold">
                {isOAuthAccountNotLinked
                  ? 'Account Already Exists'
                  : isCalcomError
                    ? 'Scheduling Integration Required'
                    : isVerificationError
                      ? 'Sign-In Link Expired'
                      : 'Something Went Wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-lg leading-relaxed">
                {isOAuthAccountNotLinked
                  ? 'An account with this email address already exists using a different sign-in method.'
                  : isCalcomError
                    ? "We couldn't set up your scheduling integration, which is required for all mentors on Discuno. This allows students to book mentoring sessions with you directly."
                    : isVerificationError
                      ? 'The sign-in link you clicked is no longer valid. Links expire after a short time for security reasons.'
                      : 'We encountered an issue while trying to sign you in. This could be due to a temporary service issue or a problem with your account.'}
              </p>

              {/* Error-specific content */}
              {isOAuthAccountNotLinked ? (
                <div className="space-y-4">
                  <h3 className="text-foreground font-semibold">How to fix this:</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <Users className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">
                          Try a different sign-in method
                        </p>
                        <p className="text-muted-foreground text-sm">
                          You may have previously signed up with Google or Microsoft. Try both
                          options on the sign-in page.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">
                          Use your original sign-in method
                        </p>
                        <p className="text-muted-foreground text-sm">
                          If you previously signed in with Microsoft, use Microsoft. If you used
                          Google, use Google.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isVerificationError ? (
                <div className="space-y-4">
                  <h3 className="text-foreground font-semibold">What happened?</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Link has expired</p>
                        <p className="text-muted-foreground text-sm">
                          Sign-in links are only valid for a limited time for security purposes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCw className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Request a new link</p>
                        <p className="text-muted-foreground text-sm">
                          Simply return to the sign-in page and request a new email link with your
                          .edu address
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isCalcomError ? (
                <div className="space-y-4">
                  <h3 className="text-foreground font-semibold">This might be due to:</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <Globe className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Temporary service issue</p>
                        <p className="text-muted-foreground text-sm">
                          Our scheduling service might be temporarily unavailable
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Account setup required</p>
                        <p className="text-muted-foreground text-sm">
                          Your educational email might need additional verification
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-foreground font-semibold">Try these solutions:</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Refresh and try again</p>
                        <p className="text-muted-foreground text-sm">
                          Sometimes a simple refresh can resolve temporary issues
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-medium">Check your email requirements</p>
                        <p className="text-muted-foreground text-sm">
                          Make sure you&apos;re using a valid .edu email address
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild variant="default">
                  <Link href="/auth" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {isOAuthAccountNotLinked
                      ? 'Try Different Sign-In'
                      : isVerificationError
                        ? 'Request New Link'
                        : 'Try Again'}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>

              {/* Support */}
              <div className="border-border/50 border-t pt-6">
                <p className="text-muted-foreground text-sm">
                  {isOAuthAccountNotLinked
                    ? 'Need help? Try using the same sign-in method you used when you first created your account.'
                    : isVerificationError
                      ? 'Check your email for the newest sign-in link. Make sure to use it within a few minutes of receiving it.'
                      : isCalcomError
                        ? 'Still having trouble? Our scheduling integration is essential for the mentor experience. Please try again in a few minutes or contact support.'
                        : 'Still having trouble? Contact our support team for assistance.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
const AuthErrorPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>
}) => {
  const params = await searchParams

  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="text-center">
            <RefreshCw className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
      }
    >
      <ErrorContent searchParams={params} />
    </Suspense>
  )
}

export default AuthErrorPage
