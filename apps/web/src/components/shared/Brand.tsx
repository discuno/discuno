import Link from 'next/link'
import { IconLogo } from '~/components/icons/IconLogo'
import { cn } from '~/lib/utils'

interface BrandProps {
  href?: string
  className?: string
  compact?: boolean
}

export const Brand = ({ href = '/', className, compact = false }: BrandProps) => {
  return (
    <Link
      href={href}
      className={cn(
        'text-foreground inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none',
        className
      )}
      aria-label="Discuno home"
    >
      <span className="bg-primary text-primary-foreground border-foreground/25 before:bg-highlight relative flex h-9 w-9 items-center justify-center rounded-md border shadow-[2px_2px_0_rgba(13,20,39,0.2)] before:absolute before:-top-1 before:right-0 before:h-1.5 before:w-4 before:rotate-3 before:content-['']">
        <IconLogo className="h-[18px] w-6" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="font-display text-xl leading-none font-semibold tracking-[-0.035em]">
          Discuno
        </span>
      )}
    </Link>
  )
}
