'use client'

import { Check, Circle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { ProfileDraft, ProfileRequirement } from './profile-form-state'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '~/components/ui/progress'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'

interface ProfilePreviewCardProps {
  draft: ProfileDraft
  imageUrl: string | null
  school: string | null
  savedUsername: string | null
  requirements: ProfileRequirement[]
  readinessPercent: number
  isReady: boolean
  isDirty: boolean
}

const getInitials = (name: string): string => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'M'
}

export const ProfilePreviewCard = ({
  draft,
  imageUrl,
  school,
  savedUsername,
  requirements,
  readinessPercent,
  isReady,
  isDirty,
}: ProfilePreviewCardProps) => {
  const completedCount = requirements.filter(requirement => requirement.complete).length
  const remainingCount = requirements.length - completedCount

  return (
    <div className="flex flex-col gap-6">
      <Card aria-labelledby="student-preview-heading">
        <CardHeader>
          <CardTitle id="student-preview-heading" role="heading" aria-level={2}>
            Student preview
          </CardTitle>
          <CardDescription>Updates as you edit.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage
                src={imageUrl ?? ''}
                alt={draft.name.trim() ? `${draft.name.trim()}'s profile photo` : 'Profile preview'}
              />
              <AvatarFallback>{getInitials(draft.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">{draft.name.trim() || 'Your name'}</p>
              <p className="text-muted-foreground mt-0.5 truncate text-sm">
                {[draft.major.trim(), school].filter(Boolean).join(' · ') ||
                  'Your academic context'}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground line-clamp-5 text-sm leading-6">
            {draft.bio.trim() || 'Your introduction will appear here.'}
          </p>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
          {savedUsername ? (
            <Link
              href={`/mentor/${savedUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              View public profile
              <ExternalLink data-icon="inline-end" aria-hidden="true" />
            </Link>
          ) : (
            <Button variant="outline" disabled>
              Save a username to view your profile
            </Button>
          )}
          <p className="text-muted-foreground text-center text-xs leading-5">
            {isDirty
              ? 'The link opens your last saved profile.'
              : 'The link opens the profile students can see.'}
          </p>
        </CardFooter>
      </Card>

      <Separator />

      <section aria-labelledby="profile-readiness-heading">
        <Progress
          value={readinessPercent}
          aria-label="Profile readiness"
          aria-valuetext={`${completedCount} of ${requirements.length} profile essentials complete`}
        >
          <ProgressLabel id="profile-readiness-heading" role="heading" aria-level={2}>
            {isReady ? 'Profile essentials complete' : 'Profile readiness'}
          </ProgressLabel>
          <ProgressValue />
        </Progress>

        <ul className="mt-4 flex flex-col gap-2.5" aria-label="Profile essentials">
          {requirements.map(requirement => (
            <li
              key={requirement.id}
              className={cn(
                'flex items-center gap-2 text-sm',
                !requirement.complete && 'text-muted-foreground'
              )}
            >
              {requirement.complete ? (
                <Check aria-hidden="true" className="text-primary size-4" />
              ) : (
                <Circle aria-hidden="true" className="size-4" />
              )}
              <span>{requirement.label}</span>
              <span className="sr-only">{requirement.complete ? 'Complete' : 'Not complete'}</span>
            </li>
          ))}
        </ul>

        {!isReady && (
          <p className="text-muted-foreground mt-4 text-xs leading-5">
            {remainingCount} {remainingCount === 1 ? 'essential remains' : 'essentials remain'}.
          </p>
        )}
      </section>
    </div>
  )
}
