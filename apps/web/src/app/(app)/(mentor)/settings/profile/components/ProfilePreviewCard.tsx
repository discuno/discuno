'use client'

import { Check, Circle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { ProfileDraft, ProfileRequirement } from './profile-form-state'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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
    <Card>
      <CardHeader className="gap-3">
        <Badge variant="secondary" className="w-fit">
          Student view
        </Badge>
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarImage
              src={imageUrl ?? ''}
              alt={draft.name.trim() ? `${draft.name.trim()}'s profile photo` : 'Profile preview'}
            />
            <AvatarFallback>{getInitials(draft.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{draft.name.trim() || 'Your name'}</CardTitle>
            <CardDescription className="mt-1 truncate">
              {[draft.major.trim(), school].filter(Boolean).join(' · ') || 'Your academic context'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-muted-foreground line-clamp-4 text-sm leading-6">
          {draft.bio.trim() ||
            'Your introduction will help a student decide whether your firsthand experience fits the question they are facing.'}
        </p>

        <Separator />

        <Progress
          value={readinessPercent}
          aria-label="Profile readiness"
          aria-valuetext={`${completedCount} of ${requirements.length} profile essentials complete`}
        >
          <ProgressLabel>
            {isReady ? 'Profile essentials complete' : 'Profile readiness'}
          </ProgressLabel>
          <ProgressValue />
        </Progress>

        <ul className="flex flex-wrap gap-2" aria-label="Profile essentials">
          {requirements.map(requirement => (
            <li key={requirement.id}>
              <Badge variant={requirement.complete ? 'secondary' : 'outline'} className="gap-1">
                {requirement.complete ? (
                  <Check aria-hidden="true" className="size-3" />
                ) : (
                  <Circle aria-hidden="true" className="size-3" />
                )}
                {requirement.label}
              </Badge>
            </li>
          ))}
        </ul>

        {!isReady && (
          <p className="text-muted-foreground text-xs leading-5">
            {remainingCount} {remainingCount === 1 ? 'essential remains' : 'essentials remain'}{' '}
            before this profile step is complete.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {savedUsername ? (
          <Button
            render={
              <Link href={`/mentor/${savedUsername}`} target="_blank" rel="noopener noreferrer" />
            }
            nativeButton={false}
            variant="outline"
          >
            View public profile
            <ExternalLink data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Save a username to view your profile
          </Button>
        )}
        <p className="text-muted-foreground text-center text-xs leading-5">
          {isDirty
            ? 'The link opens your last saved public version.'
            : 'The link opens the version students can see.'}
        </p>
      </CardFooter>
    </Card>
  )
}
