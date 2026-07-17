import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { Icons } from '~/components/shared/icons'

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Find mentors', href: '/#mentors' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'College guides', href: '/blog' },
    ],
  },
  {
    title: 'Mentors',
    links: [
      { label: 'Become a mentor', href: '/for-mentors' },
      { label: 'Mentor sign in', href: '/auth?intent=mentor' },
      { label: 'Mentor dashboard', href: '/settings' },
    ],
  },
  {
    title: 'Discuno',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Help and support', href: '/support' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export const Footer = () => {
  return (
    <footer className="bg-secondary/45 border-foreground/15 border-t-2">
      <div className="page-container py-10 sm:py-12">
        <div className="grid gap-10 md:grid-cols-[1.15fr_2fr] lg:gap-20">
          <div className="max-w-sm">
            <Brand />
            <p className="text-muted-foreground mt-4 text-sm leading-6">
              For college decisions that deserve more context than search can give.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://linkedin.com/company/discuno"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-full transition-colors"
                aria-label="Discuno on LinkedIn"
              >
                <Icons.linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/discunoapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-full transition-colors"
                aria-label="Discuno on Instagram"
              >
                <Icons.instagram className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/discuno"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-11 items-center justify-center rounded-full transition-colors"
                aria-label="Discuno on X"
              >
                <Icons.twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {footerGroups.map(group => (
              <div key={group.title}>
                <h2 className="text-foreground text-sm font-semibold">{group.title}</h2>
                <ul className="mt-3 flex flex-col gap-0.5 sm:gap-2">
                  {group.links.map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm transition-colors sm:min-h-0"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-foreground/15 text-muted-foreground mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© Discuno. All rights reserved.</p>
          <p>One question. One useful conversation. A clearer next move.</p>
        </div>
      </div>
    </footer>
  )
}
