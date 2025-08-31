import { Suspense } from 'react'
import { NavBar } from '~/app/(app)/(layout)/nav/NavBar'
import { NavBarSkeleton } from '~/app/(app)/(layout)/nav/NavigationClient'
import { FingerprintProvider } from '~/lib/providers/FingerprintProvider'
import '~/styles/globals.css'

const PublicLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBar />
      </Suspense>

      <main className="flex-1 pt-16">
        <div className="min-h-full">
          <FingerprintProvider>{children}</FingerprintProvider>
        </div>
      </main>
    </div>
  )
}

export default PublicLayout
