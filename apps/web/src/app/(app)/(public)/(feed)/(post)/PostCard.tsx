'use client'

import { ArrowUpRight, BadgeCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { logAnalyticsEvent } from '~/app/(app)/(public)/(feed)/(post)/actions'
import type { Card } from '~/app/types'
import { Badge } from '~/components/ui/badge'
import { Button, buttonVariants } from '~/components/ui/button'
import { getClientAnalyticsConsentSnapshot } from '~/lib/analytics/client-consent'
import { cn } from '~/lib/utils'

export const PostCard = ({
  card,
  discoveryReturnHref,
}: {
  card: Card
  discoveryReturnHref?: string
}) => {
  const [imageFailed, setImageFailed] = useState(false)

  const handleProfileView = () => {
    if (getClientAnalyticsConsentSnapshot() === 'enabled') {
      void import('posthog-js').then(({ default: posthog }) => {
        posthog.capture('profile_view', {
          post_user_id: card.createdById,
          post_id: card.id,
        })
      })
    }

    void logAnalyticsEvent({
      eventType: 'PROFILE_VIEW',
      targetUserId: card.createdById,
      postId: card.id,
    })
  }

  const profileHref = card.username
    ? `/mentor/${card.username}${
        discoveryReturnHref ? `?returnTo=${encodeURIComponent(discoveryReturnHref)}` : ''
      }`
    : null
  const name = card.name ?? 'Student mentor'
  const firstName = name.trim().split(/\s+/).find(Boolean) ?? 'their'
  const initial = name.trim().charAt(0).toUpperCase() || 'M'
  const hasAcademicContext = [card.school, card.major].some(Boolean)
  const hasAcademicStage = [card.schoolYear, card.graduationYear].some(Boolean)

  return (
    <article
      role="listitem"
      className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-5 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[8.5rem_minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-xl">
        <span
          className="text-primary font-display flex size-full items-center justify-center text-3xl font-semibold"
          aria-hidden="true"
        >
          {initial}
        </span>
        {card.userImage && !imageFailed && (
          <Image
            src={card.userImage}
            alt={`${name} profile photo`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 639px) 80px, (max-width: 1023px) 112px, 136px"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {card.verifiedSchoolEmail && (
            <Badge variant="outline">
              <BadgeCheck aria-hidden="true" />
              School email confirmed
            </Badge>
          )}
          {card.hasFreeSessions && <Badge variant="secondary">Free session available</Badge>}
        </div>

        <h3 className="font-display mt-3 text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-3xl">
          {name}
        </h3>

        {hasAcademicContext && (
          <p className="text-muted-foreground mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {card.school &&
              (card.schoolDomainPrefix ? (
                <Link
                  href={`/find?school=${encodeURIComponent(card.schoolDomainPrefix)}#mentors`}
                  className="text-foreground font-medium hover:underline"
                >
                  {card.school}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{card.school}</span>
              ))}
            {card.school && card.major && <span aria-hidden="true">·</span>}
            {card.major && (
              <Link
                href={`/find?major=${encodeURIComponent(card.major.toLowerCase())}#mentors`}
                className="hover:text-foreground hover:underline"
              >
                {card.major}
              </Link>
            )}
          </p>
        )}

        {card.description && (
          <p className="text-muted-foreground mt-3 line-clamp-3 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
            {card.description}
          </p>
        )}

        {hasAcademicStage && (
          <p className="text-muted-foreground mt-3 text-xs">
            {[card.schoolYear, card.graduationYear ? `Class of ${card.graduationYear}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      <div className="col-span-2 sm:col-span-1 sm:col-start-2 lg:col-start-3 lg:row-start-1">
        {profileHref ? (
          <Link
            href={profileHref}
            onClick={handleProfileView}
            aria-label={`See ${name}'s sessions`}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-fit')}
          >
            See {firstName}&rsquo;s sessions
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        ) : (
          <Button variant="outline" className="w-full sm:w-fit" disabled>
            Profile unavailable
          </Button>
        )}
      </div>
    </article>
  )
}
