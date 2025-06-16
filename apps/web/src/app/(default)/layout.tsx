import '~/styles/globals.css'

import { Suspense } from 'react'
import { Footer } from '~/app/(default)/(layout)/Footer'
import { NavBar } from '~/app/(default)/(layout)/nav/NavBar'
import { AuthGuard } from '~/components/auth/AuthGuard'

const RootLayout = async ({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) => {
  return (
    <AuthGuard>
      <div className="bg-background flex min-h-screen flex-col">
        <Suspense fallback={<div className="bg-card h-16 animate-pulse border border-b" />}>
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
    </AuthGuard>
  )
}

export default RootLayout
