'use client'

import { ArrowUpRight, BadgeCheck, BookOpen, Building2, GraduationCap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { logAnalyticsEvent } from '~/app/(app)/(public)/(feed)/(post)/actions'
import type { Card } from '~/app/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

export const PostCard = ({ card }: { card: Card }) => {
  const [imageFailed, setImageFailed] = useState(false)

  const handleProfileView = () => {
    void import('posthog-js').then(({ default: posthog }) => {
      const distinctId = posthog.get_distinct_id()
      posthog.capture('profile_view', {
        post_user_id: card.createdById,
        post_id: card.id,
      })
      void logAnalyticsEvent({
        eventType: 'PROFILE_VIEW',
        distinctId,
        targetUserId: card.createdById,
        postId: card.id,
      })
    })
  }

  const profileHref = card.username ? `/mentor/${card.username}` : null
  const initial = card.name?.trim().charAt(0).toUpperCase() ?? 'M'

  return (
    <article className="bg-card hover:border-primary/30 group flex h-full flex-col overflow-hidden rounded-xl border transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: card.schoolPrimaryColor ?? 'hsl(var(--primary))' }}
        aria-hidden="true"
      />

      <div className="bg-secondary relative flex h-40 items-center justify-center overflow-hidden">
        <div className="border-card relative h-24 w-24 overflow-hidden rounded-full border-4 shadow-[0_6px_18px_rgba(15,23,42,0.12)]">
          <div
            className="bg-card text-primary absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-4xl font-semibold tracking-[-0.06em] opacity-35">{initial}</span>
          </div>
          {card.userImage && !imageFailed && (
            <Image
              src={card.userImage}
              alt={`${card.name ?? 'Mentor'} profile photo`}
              fill
              className="z-10 object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="96px"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {card.verifiedSchoolEmail && (
            <Badge className="border-white/70 bg-white/95 text-slate-800 shadow-sm hover:bg-white">
              <BadgeCheck className="text-success mr-1 h-3.5 w-3.5" />
              School email verified
            </Badge>
          )}
        </div>

        {card.hasFreeSessions && (
          <Badge className="bg-success text-success-foreground hover:bg-success absolute right-3 bottom-3 border-transparent shadow-sm">
            Free session available
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-[-0.025em]">
            {profileHref ? (
              <Link href={profileHref} onClick={handleProfileView} className="hover:text-primary">
                {card.name ?? 'Student mentor'}
              </Link>
            ) : (
              (card.name ?? 'Student mentor')
            )}
          </h2>

          <div className="text-muted-foreground mt-3 space-y-2 text-sm">
            {card.school && (
              <div className="flex items-center gap-2">
                <Building2 className="text-primary h-4 w-4 shrink-0" />
                <Link
                  href={`/?school=${encodeURIComponent(card.schoolDomainPrefix ?? '')}#mentors`}
                  className="text-foreground truncate font-medium hover:underline"
                  title={card.school}
                >
                  {card.school}
                </Link>
              </div>
            )}
            {card.major && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 shrink-0" />
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

          {card.description && (
            <p className="text-muted-foreground mt-4 line-clamp-2 text-sm leading-6">
              {card.description}
            </p>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-4 text-xs">
            {card.schoolYear && (
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                {card.schoolYear}
              </span>
            )}
            {card.graduationYear && <span>Class of {card.graduationYear}</span>}
          </div>

          {profileHref ? (
            <Button asChild className="w-full">
              <Link href={profileHref} onClick={handleProfileView}>
                View profile and availability
                <ArrowUpRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Profile unavailable
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
