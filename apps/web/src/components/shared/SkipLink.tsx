export function SkipLink({ href }: { href: `#${string}` }) {
  return (
    <a
      href={href}
      className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:outline-none"
    >
      Skip to content
    </a>
  )
}
