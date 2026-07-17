'use client'

import { ArrowUpRight, BadgeCheck, BookOpen, Building2, GraduationCap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { logAnalyticsEvent } from '~/app/(app)/(public)/(feed)/(post)/actions'
import type { Card } from '~/app/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Item, ItemContent, ItemMedia, ItemTitle } from '~/components/ui/item'
import { getClientAnalyticsConsentSnapshot } from '~/lib/analytics/client-consent'
import { cn } from '~/lib/utils'

export const PostCard = ({ card, featured = false }: { card: Card; featured?: boolean }) => {
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

    // This first-party signal powers mentor discovery inside Discuno. It is
    // intentionally independent from optional PostHog analytics.
    void logAnalyticsEvent({
      eventType: 'PROFILE_VIEW',
      targetUserId: card.createdById,
      postId: card.id,
    })
  }

  const profileHref = card.username ? `/mentor/${card.username}` : null
  const initial = card.name?.trim().charAt(0).toUpperCase() ?? 'M'

  return (
    <article
      className={cn(
        'paper-panel interactive-card corner-mark group flex h-full flex-col p-5',
        featured && 'p-6 sm:p-8'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {card.verifiedSchoolEmail && (
          <Badge variant="outline" className="bg-background gap-1.5">
            <BadgeCheck className="text-success size-3.5" aria-hidden="true" />
            School email confirmed
          </Badge>
        )}
        {card.hasFreeSessions && (
          <Badge className="bg-success text-success-foreground hover:bg-success">
            Free session available
          </Badge>
        )}
      </div>

      <Item className="mt-5 flex-nowrap items-start rounded-none border-0 p-0">
        <ItemMedia
          variant="image"
          className={cn(
            'bg-secondary border-foreground/20 relative size-16 rounded-lg border shadow-[2px_2px_0_rgba(13,20,39,0.12)]',
            featured && 'size-20 sm:size-24'
          )}
        >
          <span
            className="text-primary flex size-full items-center justify-center text-2xl font-semibold"
            aria-hidden="true"
          >
            {initial}
          </span>
          {card.userImage && !imageFailed && (
            <Image
              src={card.userImage}
              alt={`${card.name ?? 'Mentor'} profile photo`}
              fill
              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
              sizes={featured ? '96px' : '64px'}
              onError={() => setImageFailed(true)}
            />
          )}
        </ItemMedia>

        <ItemContent className="min-w-0 gap-2">
          <ItemTitle className="max-w-full">
            <h3
              className={cn(
                'font-display text-foreground line-clamp-1 text-2xl leading-none font-semibold tracking-[-0.025em]',
                featured && 'text-2xl sm:text-3xl'
              )}
            >
              {profileHref ? (
                <Link href={profileHref} onClick={handleProfileView} className="hover:text-primary">
                  {card.name ?? 'Student mentor'}
                </Link>
              ) : (
                (card.name ?? 'Student mentor')
              )}
            </h3>
          </ItemTitle>

          <div className="text-muted-foreground flex min-w-0 flex-col gap-1.5 text-sm">
            {card.school && (
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="text-primary size-4 shrink-0" aria-hidden="true" />
                {card.schoolDomainPrefix ? (
                  <Link
                    href={`/?school=${encodeURIComponent(card.schoolDomainPrefix)}#mentors`}
                    className="text-foreground truncate font-medium hover:underline"
                    title={card.school}
                  >
                    {card.school}
                  </Link>
                ) : (
                  <span className="text-foreground truncate font-medium">{card.school}</span>
                )}
              </div>
            )}
            {card.major && (
              <div className="flex min-w-0 items-center gap-2">
                <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                <Link
                  href={`/?major=${encodeURIComponent(card.major.toLowerCase())}#mentors`}
                  className="truncate hover:underline"
                  title={card.major}
                >
                  {card.major}
                </Link>
              </div>
            )}
          </div>
        </ItemContent>
      </Item>

      {card.description && (
        <p
          className={cn(
            'text-muted-foreground mt-5 line-clamp-3 text-sm leading-6',
            featured && 'max-w-2xl text-base leading-7'
          )}
        >
          {card.description}
        </p>
      )}

      <div className="mt-auto pt-6">
        {Boolean(card.schoolYear ?? card.graduationYear) && (
          <div className="text-muted-foreground border-foreground/15 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-4 text-xs">
            {card.schoolYear && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="size-3.5" aria-hidden="true" />
                {card.schoolYear}
              </span>
            )}
            {card.graduationYear && <span>Class of {card.graduationYear}</span>}
          </div>
        )}

        {profileHref ? (
          <Button
            render={<Link href={profileHref} onClick={handleProfileView} />}
            nativeButton={false}
            className={cn('w-full', featured && 'sm:w-auto')}
            size={featured ? 'lg' : 'default'}
          >
            See how they can help
            <ArrowUpRight />
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Profile unavailable
          </Button>
        )}
      </div>
    </article>
  )
}
