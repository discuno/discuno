'use client'

import { Home, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export const UnderConstructionPage = () => {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Wrench className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>
            This page is currently under construction. Please check back later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/" passHref>
            <Button variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
