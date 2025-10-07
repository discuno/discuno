'use client'

import { AlertCircle, ArrowLeft, Home, RefreshCw, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

interface PostErrorProps {
  error: Error & { digest?: string; statusCode?: number; code?: string }
  reset: () => void
}

export default function PostError({ error, reset }: PostErrorProps) {
  const router = useRouter()

  // Handle post not found
  if (error.name === 'NotFoundError' && error.message.includes('Post')) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Post Not Found</CardTitle>
            <CardDescription>
              The post you&apos;re looking for doesn&apos;t exist or may have been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/browse')}>
              <Search className="mr-2 h-4 w-4" />
              Browse All Posts
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle user profile not found
  if (
    error.name === 'NotFoundError' &&
    (error.message.includes('User') || error.message.includes('Profile'))
  ) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Profile Unavailable</CardTitle>
            <CardDescription>
              This user&apos;s profile is currently unavailable. They may have incomplete profile
              information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle authentication errors
  if (error.name === 'UnauthenticatedError') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view this post and access booking features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => router.push('/auth')}>
              Sign In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
              <Home className="mr-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle external API errors (e.g., Cal.com integration issues)
  if (error.name === 'ExternalApiError') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>Booking Service Unavailable</CardTitle>
            <CardDescription>
              The booking service is temporarily unavailable. You can still view the profile, but
              booking features may not work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle generic errors
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Unable to Load Post</CardTitle>
          <CardDescription>
            Something went wrong while loading this post. Please try again or return to the
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
