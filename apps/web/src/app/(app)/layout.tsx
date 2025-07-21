import '~/styles/globals.css'

import { Suspense } from 'react'
import { Footer } from '~/app/(app)/(public)/(layout)/Footer'
import { NavBar } from '~/app/(app)/(public)/(layout)/nav/NavBar'
import { NavBarSkeleton } from '~/app/(app)/(public)/(layout)/nav/NavigationClient'

const RootLayout = async ({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) => {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBar />
      </Suspense>

      <main className="from-background via-muted/30 to-secondary/20 flex-1 bg-gradient-to-br">
        <div className="min-h-full">
          {children}
          {modal}
        </div>
      </main>

      <Footer />
      <div id="modal-root" />
    </div>
  )
}

export default RootLayout
