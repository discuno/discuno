import '~/styles/globals.css'

import { Suspense } from 'react'
import { Footer } from '~/app/(app)/(layout)/Footer'
import { NavBar } from '~/app/(app)/(layout)/nav/NavBar'
import { NavBarSkeleton } from '~/app/(app)/(layout)/nav/NavigationClient'

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBar />
      </Suspense>

      <main className="from-background via-muted/30 to-secondary/20 flex-1 bg-gradient-to-br pt-16">
        <div className="min-h-full">{children}</div>
      </main>

      <Footer />
    </div>
  )
}

export default RootLayout
