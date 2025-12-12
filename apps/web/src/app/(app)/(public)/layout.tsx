import { Suspense } from 'react'
import { NavBar } from '~/app/(app)/(layout)/nav/NavBar'
import { NavBarSkeleton } from '~/app/(app)/(layout)/nav/NavigationClient'
import { Footer } from '~/components/shared/Footer'
import '~/styles/globals.css'

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBar />
      </Suspense>

      <main className="flex-1">
        <div className="min-h-screen">{children}</div>
      </main>

      <Footer />
    </div>
  )
}

export default PublicLayout
