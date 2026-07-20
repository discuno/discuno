import { Brand } from '~/components/shared/Brand'
import { SkipLink } from '~/components/shared/SkipLink'

export default function TransactionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink href="#transaction-content" />
      <header className="border-b">
        <div className="page-shell flex h-16 items-center">
          <Brand />
        </div>
      </header>
      <main id="transaction-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
    </div>
  )
}
