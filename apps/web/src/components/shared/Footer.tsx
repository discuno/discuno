import Link from 'next/link'
import { Brand } from '~/components/shared/Brand'
import { Icons } from '~/components/shared/icons'

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Find mentors', href: '/#mentors' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Student resources', href: '/blog' },
    ],
  },
  {
    title: 'Mentors',
    links: [
      { label: 'Why mentor', href: '/for-mentors' },
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
    <footer className="bg-card border-t">
      <div className="page-container py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.3fr_2fr] lg:gap-20">
          <div className="max-w-sm">
            <Brand />
            <p className="text-muted-foreground mt-4 text-sm leading-6">
              Practical college guidance from student mentors who know the path firsthand.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://linkedin.com/company/discuno"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
                aria-label="Discuno on LinkedIn"
              >
                <Icons.linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/discunoapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
                aria-label="Discuno on Instagram"
              >
                <Icons.instagram className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/discuno"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
                aria-label="Discuno on X"
              >
                <Icons.twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerGroups.map(group => (
              <div key={group.title}>
                <h2 className="text-foreground text-sm font-semibold">{group.title}</h2>
                <ul className="mt-4 space-y-3">
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
          </div>
        </div>

        <div className="text-muted-foreground mt-12 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© Discuno. All rights reserved.</p>
          <p>Built for clearer college decisions.</p>
        </div>
      </div>
    </footer>
  )
}
