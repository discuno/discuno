'use client'

import { upload } from '@vercel/blob/client'
import { Trash2, Upload, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { removeUserProfileImage, updateUserProfileImage } from '../actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
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
import { Field, FieldDescription, FieldLabel } from '~/components/ui/field'
import { Spinner } from '~/components/ui/spinner'
import { compressFile } from '~/lib/blob/client-utils'

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  userName?: string | null
  userId: string
  onImageChange?: (imageUrl: string | null) => void
}

type PhotoAction = 'upload' | 'remove' | null

const MAX_FILE_SIZE = 5 * 1024 * 1024

const getInitials = (name: string | null | undefined): string => {
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'M'
}

export const ProfileImageUpload = ({
  currentImageUrl,
  userName,
  userId,
  onImageChange,
}: ProfileImageUploadProps) => {
  const [activeAction, setActiveAction] = useState<PhotoAction>(null)
  const [persistedUrl, setPersistedUrl] = useState<string | null>(currentImageUrl ?? null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const temporaryPreviewRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (temporaryPreviewRef.current) URL.revokeObjectURL(temporaryPreviewRef.current)
    },
    []
  )

  const clearTemporaryPreview = () => {
    if (temporaryPreviewRef.current) {
      URL.revokeObjectURL(temporaryPreviewRef.current)
      temporaryPreviewRef.current = null
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setStatusMessage('')

    if (!file.type.startsWith('image/')) {
      const message = 'Choose a JPG, PNG, GIF, or WebP image.'
      toast.error(message)
      setStatusMessage(message)
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      const message = 'Choose an image smaller than 5 MB.'
      toast.error(message)
      setStatusMessage(message)
      event.target.value = ''
      return
    }

    setActiveAction('upload')
    try {
      const compressedFile = await compressFile(file)

      clearTemporaryPreview()
      const objectUrl = URL.createObjectURL(compressedFile)
      temporaryPreviewRef.current = objectUrl
      setPreviewUrl(objectUrl)

      const newBlob = await upload(`profile-images/${userId}/avatar.webp`, compressedFile, {
        access: 'public',
        handleUploadUrl: '/api/avatar/upload',
      })

      await updateUserProfileImage(newBlob.url)

      clearTemporaryPreview()
      setPersistedUrl(newBlob.url)
      setPreviewUrl(newBlob.url)
      onImageChange?.(newBlob.url)
      setStatusMessage('Profile photo updated.')
      toast.success('Profile photo updated.')
    } catch {
      clearTemporaryPreview()
      setPreviewUrl(persistedUrl)
      const message = 'We could not update your photo. Please try again.'
      setStatusMessage(message)
      toast.error(message)
    } finally {
      setActiveAction(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    if (!persistedUrl) return

    setRemoveDialogOpen(false)
    setStatusMessage('')
    setActiveAction('remove')

    try {
      await removeUserProfileImage()
      clearTemporaryPreview()
      setPersistedUrl(null)
      setPreviewUrl(null)
      onImageChange?.(null)
      setStatusMessage('Profile photo removed.')
      toast.success('Profile photo removed.')
    } catch {
      const message = 'We could not remove your photo. Please try again.'
      setStatusMessage(message)
      toast.error(message)
    } finally {
      setActiveAction(null)
    }
  }

  const isBusy = activeAction !== null

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Profile photo</CardTitle>
          <Badge variant="outline">Required</Badge>
        </div>
        <CardDescription>
          Use a clear, recent photo so a student knows who they are meeting.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Avatar className="size-32 sm:size-36">
          <AvatarImage
            src={previewUrl ?? ''}
            alt={userName?.trim() ? `${userName.trim()}'s profile photo` : 'Profile photo preview'}
          />
          <AvatarFallback>
            {userName?.trim() ? (
              <span className="text-2xl font-semibold">{getInitials(userName)}</span>
            ) : (
              <User aria-hidden="true" className="size-10" />
            )}
          </AvatarFallback>
        </Avatar>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Field>
          <FieldLabel htmlFor="profile-photo-file" className="sr-only">
            Choose a profile photo
          </FieldLabel>
          <input
            ref={fileInputRef}
            id="profile-photo-file"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={isBusy}
            aria-describedby="profile-photo-help profile-photo-status"
            className="sr-only"
            tabIndex={-1}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            aria-controls="profile-photo-file"
          >
            {activeAction === 'upload' ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Upload data-icon="inline-start" aria-hidden="true" />
            )}
            {activeAction === 'upload'
              ? 'Uploading photo…'
              : previewUrl
                ? 'Choose a different photo'
                : 'Choose a photo'}
          </Button>
          <FieldDescription id="profile-photo-help" className="text-center">
            JPG, PNG, GIF, or WebP. Up to 5 MB.
          </FieldDescription>
        </Field>

        {persistedUrl && (
          <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
            <AlertDialogTrigger render={<Button type="button" variant="ghost" disabled={isBusy} />}>
              {activeAction === 'remove' ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2 data-icon="inline-start" aria-hidden="true" />
              )}
              {activeAction === 'remove' ? 'Removing photo…' : 'Remove photo'}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove your profile photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your profile setup will be incomplete until you add another photo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep photo</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void handleRemoveImage()}>
                  Remove photo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <p
          id="profile-photo-status"
          className="text-muted-foreground min-h-5 text-center text-xs"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      </CardFooter>
    </Card>
  )
}
