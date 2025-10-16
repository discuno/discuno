'use client'

import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

interface StatusDotProps {
  status: 'active' | 'inactive'
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const StatusDot = ({ status, animated = true, size = 'sm', className }: StatusDotProps) => {
  const sizeClasses = {
    sm: 'size-2',
    md: 'size-2.5',
    lg: 'size-3',
  }

  const bgColor = {
    active: 'bg-green-500',
    inactive: 'bg-red-500',
  }

  const pingColor = {
    active: 'bg-green-400',
    inactive: 'bg-red-400',
  }

  const tooltipText = {
    active: 'Active',
    inactive: 'Inactive',
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('relative inline-flex', sizeClasses[size], className)}>
            {animated && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  pingColor[status]
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full',
                sizeClasses[size],
                bgColor[status]
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
