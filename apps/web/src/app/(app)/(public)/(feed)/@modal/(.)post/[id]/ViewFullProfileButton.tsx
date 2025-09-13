'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

interface ViewFullProfileButtonProps {
  postId: number
  className?: string
}

export function ViewFullProfileButton({ className }: ViewFullProfileButtonProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={className}>
            <Button variant="secondary" className="w-full" disabled>
              <ExternalLink className="mr-2 h-4 w-4" />
              <span className="inline sm:hidden">Full Profile</span>
              <span className="hidden sm:inline">View Full Profile</span>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Coming Soon!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
