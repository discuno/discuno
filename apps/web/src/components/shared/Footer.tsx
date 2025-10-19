import Link from 'next/link'
import { Icons } from '~/components/shared/icons'

export const Footer = () => {
  return (
    <footer className="border-border/40 border-t py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-muted-foreground text-sm">© 2025 Discuno. All rights reserved.</p>

          {/* Social Media Icons - Center */}
          <div className="flex items-center gap-4">
            <a
              href="https://linkedin.com/company/discuno"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="LinkedIn"
            >
              <Icons.linkedin className="h-5 w-5" />
            </a>
            <a
              href="https://instagram.com/discunoapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Instagram"
            >
              <Icons.instagram className="h-5 w-5" />
            </a>
            <a
              href="https://x.com/discuno"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <Icons.twitter className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/discuno/discuno"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Icons.github className="h-5 w-5" />
            </a>
          </div>

          {/* Text Links - Right */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm sm:gap-6">
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/support"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Support
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
