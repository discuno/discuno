import Link from 'next/dist/client/link'
import Image from 'next/image'

/**
 * Footer component with Cal.com sponsorship banner
 * Server component with CSS-based theme switching
 */
export const Footer = () => {
  const calBookingUrl = 'https://cal.com/discuno'

  return (
    <footer className="border/40 bg-background/80 border-t backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col items-center space-y-3">
          {/* Main footer content in a single row on larger screens */}
          <div className="flex flex-col items-center space-y-3 md:w-full md:flex-row md:justify-between md:space-y-0">
            {/* Copyright - left side on desktop */}
            <div className="text-muted-foreground text-center text-sm md:text-left">
              <p>© {new Date().getFullYear()} Discuno. Built with ❤️ for students by students.</p>
            </div>

            {/* Cal.com Sponsorship Banner - center */}
            <div className="flex flex-col items-center space-y-1">
              <p className="text-muted-foreground text-xs">Sponsored by</p>
              <a
                href={calBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
                aria-label="Book us with Cal.com"
              >
                {/* Light theme banner */}
                <Image
                  alt="Book us with Cal.com"
                  src="https://cal.com/book-with-cal-light.svg"
                  className="h-6 w-auto dark:hidden"
                  loading="lazy"
                  width={100}
                  height={100}
                />
                {/* Dark theme banner */}
                <Image
                  alt="Book us with Cal.com"
                  src="https://cal.com/book-with-cal-dark.svg"
                  className="hidden h-6 w-auto dark:block"
                  loading="lazy"
                  width={100}
                  height={100}
                />
              </a>
            </div>

            {/* Footer Links - right side on desktop */}
            <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-xs md:justify-end">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <a
                href="https://github.com/bradmcnew/discuno"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
