/**
 * Footer component
 * Server component
 */
export const Footer = () => {
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

            {/* Footer Links - right side on desktop */}
            <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-xs md:justify-end">
              <a href="/about" className="hover:text-foreground transition-colors">
                About
              </a>
              <a href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </a>
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
