import { Suspense } from 'react'
import { Spinner } from '~/components/ui/spinner'

interface ProfileShellProps {
  title: string
  description: string
  children: React.ReactNode
}

export const ProfileShell = ({ title, description, children }: ProfileShellProps) => {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">
          Public profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">{description}</p>
      </header>

      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-16">
            <Spinner />
            <span className="text-muted-foreground">Loading your profile…</span>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  )
}
