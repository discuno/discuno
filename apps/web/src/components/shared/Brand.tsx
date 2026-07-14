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
      <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
        <IconLogo className="h-[18px] w-6" aria-hidden="true" />
      </span>
      {!compact && <span className="text-lg font-bold tracking-[-0.03em]">Discuno</span>}
    </Link>
  )
}
