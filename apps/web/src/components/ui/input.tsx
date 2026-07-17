import * as React from 'react'

import { cn } from '~/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'border-foreground/20 bg-card file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring flex h-11 w-full rounded-lg border px-3.5 py-2 text-base transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
