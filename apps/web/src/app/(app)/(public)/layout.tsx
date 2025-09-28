import { Suspense } from 'react'
import { NavBar } from '~/app/(app)/(layout)/nav/NavBar'
import { NavBarSkeleton } from '~/app/(app)/(layout)/nav/NavigationClient'
import '~/styles/globals.css'

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBar />
      </Suspense>

      <main className="flex-1 pt-[var(--navbar-height)]">
        <div className="min-h-[calc(100vh-var(--navbar-height))]">{children}</div>
      </main>
    </div>
  )
}

export default PublicLayout
