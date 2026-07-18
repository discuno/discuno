'use client'

import { CircleAlert, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import type { ProfileDraft, ProfileRequirement } from './profile-form-state'

interface ProfilePreviewCardProps {
  draft: ProfileDraft
  imageUrl: string | null
  school: string | null
  savedUsername: string | null
  requirements: ProfileRequirement[]
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
  isReady,
  isDirty,
}: ProfilePreviewCardProps) => {
  const remainingRequirements = requirements.filter(requirement => !requirement.complete)

  return (
    <div className="flex flex-col gap-6">
      <section
        className="border-border flex flex-col gap-5 border-y py-6"
        aria-labelledby="student-preview-heading"
      >
        <header className="flex flex-col gap-1">
          <h2 id="student-preview-heading" className="text-lg font-semibold">
            Student preview
          </h2>
          <p className="text-muted-foreground text-sm">Updates as you edit.</p>
        </header>

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
              {[draft.major.trim(), school].filter(Boolean).join(', ') || 'Your academic context'}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-5 text-sm leading-6">
          {draft.bio.trim() || 'Your introduction will appear here.'}
        </p>

        <div className="flex flex-col gap-2">
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
            {isDirty ? 'This opens your last saved profile.' : 'This opens what students can see.'}
          </p>
        </div>
      </section>

      {!isReady ? (
        <Alert>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Finish your profile</AlertTitle>
          <AlertDescription>
            <p>Add these details to make your public profile complete:</p>
            <ul className="list-disc pl-4">
              {remainingRequirements.map(requirement => (
                <li key={requirement.id}>{requirement.label}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
