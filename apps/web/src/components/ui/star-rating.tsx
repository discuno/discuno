'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '~/lib/utils'

interface StarRatingProps {
  /**
   * Current rating value (1-5)
   */
  value?: number
  /**
   * Whether the rating is interactive (can be changed by user)
   */
  interactive?: boolean
  /**
   * Callback when rating changes (only for interactive mode)
   */
  onChange?: (rating: number) => void
  /**
   * Size of the stars
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Show the numeric rating next to the stars
   */
  showValue?: boolean
  /**
   * Custom className
   */
  className?: string
}

/**
 * StarRating Component
 *
 * Displays a 5-star rating that can be either static (display only)
 * or interactive (allows user to select a rating)
 *
 * @example
 * // Display only
 * <StarRating value={4.5} />
 *
 * @example
 * // Interactive rating
 * <StarRating value={rating} onChange={setRating} interactive />
 */
export const StarRating = ({
  value = 0,
  interactive = false,
  onChange,
  size = 'md',
  showValue = false,
  className,
}: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const displayRating = hoverRating ?? value
  const starSize = sizeClasses[size]

  const handleClick = (rating: number) => {
    if (interactive && onChange) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (interactive) {
      setHoverRating(rating)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null)
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => {
          const isFilled = star <= displayRating
          const isPartial = !isFilled && star - 0.5 <= displayRating

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
              disabled={!interactive}
              className={cn(
                'relative transition-colors',
                interactive && 'cursor-pointer hover:scale-110',
                !interactive && 'cursor-default'
              )}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              {/* Background star (empty) */}
              <Star className={cn(starSize, 'text-gray-300')} />

              {/* Filled star overlay */}
              {isFilled && (
                <Star
                  className={cn(starSize, 'absolute inset-0 fill-yellow-400 text-yellow-400')}
                />
              )}

              {/* Partial star overlay (for decimal ratings in display mode) */}
              {isPartial && !interactive && (
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star
                    className={cn(starSize, 'fill-yellow-400 text-yellow-400')}
                    style={{ position: 'absolute', left: 0 }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {showValue && (
        <span className="text-muted-foreground ml-2 text-sm font-medium">
          {value > 0 ? value.toFixed(1) : 'No ratings'}
        </span>
      )}
    </div>
  )
}
