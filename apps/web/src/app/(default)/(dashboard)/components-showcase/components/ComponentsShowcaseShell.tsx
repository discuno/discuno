import { Sparkles, Zap } from 'lucide-react'
import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { Badge } from '~/components/ui/badge'

interface ComponentsShowcaseShellProps {
  children: React.ReactNode
}

export const ComponentsShowcaseShell = ({ children }: ComponentsShowcaseShellProps) => {
  return (
    <div className="from-background via-background to-accent/5 min-h-screen bg-gradient-to-br">
      <div className="container mx-auto max-w-7xl p-6">
        {/* Static hero section that renders immediately */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles className="text-primary h-8 w-8" />
            <h1 className="from-primary to-accent bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
              @discuno/atoms
            </h1>
          </div>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed">
            A modern, hydration-safe replacement for @calcom/atoms. Built with Next.js 15,
            TypeScript, and zero hydration issues.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="mr-1 h-3 w-3" />
              Zero Hydration Issues
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              TypeScript First
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              React Query
            </Badge>
          </div>
        </div>

        {/* Dynamic content wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  )
}
