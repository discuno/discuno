import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'

const primaryLinks = [
  { label: 'Find a mentor', href: '/#mentors' },
  { label: 'Start mentoring', href: '/for-mentors' },
  { label: 'College guides', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
]

export const Footer = () => {
  return (
    <footer className="border-foreground/15 border-t">
      <div className="page-shell py-8 sm:py-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <Brand />
            <p className="text-muted-foreground text-sm">
              One question. One useful conversation. A clearer next move.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation">
            {primaryLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-foreground/15 text-muted-foreground mt-8 flex flex-col gap-3 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Discuno</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
