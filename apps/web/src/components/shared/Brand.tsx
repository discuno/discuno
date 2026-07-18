import Link from 'next/link'
import { IconLogo } from '~/components/icons/IconLogo'
import { TextLogo } from '~/components/icons/TextLogo'
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
        'text-foreground hover:text-primary inline-flex items-center rounded-sm transition-colors focus-visible:outline-none',
        className
      )}
      aria-label="Discuno home"
    >
      {compact ? (
        <IconLogo width={29} height={22} aria-hidden="true" />
      ) : (
        <TextLogo width={106} height={23} aria-hidden="true" />
      )}
    </Link>
  )
}
