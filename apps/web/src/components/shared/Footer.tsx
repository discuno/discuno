import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'

const footerLinks = [
  { label: 'Find a mentor', href: '/find' },
  { label: 'College guides', href: '/blog' },
  { label: 'Start mentoring', href: '/for-mentors' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
]

export const Footer = () => {
  return (
    <footer className="border-foreground/15 border-t">
      <div className="page-shell py-8 sm:py-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Brand />
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Student-to-student guidance for one college decision at a time.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex max-w-2xl flex-wrap gap-x-6 gap-y-3 lg:justify-end">
              {footerLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-foreground/15 text-muted-foreground mt-7 flex flex-col gap-3 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
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
