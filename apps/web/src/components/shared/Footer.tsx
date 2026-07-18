import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { buttonVariants } from '~/components/ui/button'

const linkGroups = [
  {
    title: 'Decide',
    links: [
      { label: 'Find a mentor', href: '/find' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'College guides', href: '/blog' },
    ],
  },
  {
    title: 'Mentor',
    links: [
      { label: 'Start mentoring', href: '/for-mentors' },
      { label: 'Sign in', href: '/auth?intent=mentor' },
    ],
  },
  {
    title: 'Discuno',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Support', href: '/support' },
    ],
  },
]

export const Footer = () => {
  return (
    <footer className="border-foreground/15 border-t">
      <div className="page-shell py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex max-w-xl flex-col items-start gap-5">
            <Brand />
            <p className="font-display text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-4xl">
              A clearer next move starts with one honest question.
            </p>
            <Link href="/#decision-composer" className={buttonVariants({ variant: 'outline' })}>
              Bring your question
              <ArrowRight data-icon="inline-end" />
            </Link>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer navigation">
            {linkGroups.map(group => (
              <div key={group.title}>
                <p className="text-sm font-semibold">{group.title}</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {group.links.map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
