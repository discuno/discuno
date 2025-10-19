import Link from 'next/link'

export const Footer = () => {
  return (
    <footer className="border-border/40 border-t py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-muted-foreground text-sm">© 2025 Discuno. All rights reserved.</p>
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
