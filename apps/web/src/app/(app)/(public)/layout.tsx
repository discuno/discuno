import { Suspense } from 'react'
import { NavBar } from '~/app/(app)/(layout)/nav/NavBar'
import { NavBarSkeleton } from '~/app/(app)/(layout)/nav/NavigationClient'
import { Footer } from '~/components/shared/Footer'
import { SkipLink } from '~/components/shared/SkipLink'
import '~/styles/globals.css'

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink href="#main-content" />
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBar />
      </Suspense>

      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  )
}

export default PublicLayout
