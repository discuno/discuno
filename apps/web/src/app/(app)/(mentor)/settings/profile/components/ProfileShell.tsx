import { Suspense } from 'react'
import { Spinner } from '~/components/ui/spinner'

interface ProfileShellProps {
  title: string
  description: string
  children: React.ReactNode
}

export const ProfileShell = ({ title, description, children }: ProfileShellProps) => {
  return (
    <div className="flex flex-col gap-7">
      <header className="max-w-2xl">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm leading-6">{description}</p>
      </header>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 py-12">
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
