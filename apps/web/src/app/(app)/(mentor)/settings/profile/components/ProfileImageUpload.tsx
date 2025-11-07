'use client'

import { upload } from '@vercel/blob/client'
import { Upload, User, X } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { FieldDescription } from '~/components/ui/field'
import { compressFile } from '~/lib/blob/client-utils'
import { removeUserProfileImage, updateUserProfileImage } from '../actions'

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  userName?: string | null
}

export const ProfileImageUpload = ({ currentImageUrl, userName }: ProfileImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const compressedFile = await compressFile(file)

      const objectUrl = URL.createObjectURL(compressedFile)
      setPreviewUrl(objectUrl)

      const newBlob = await upload(compressedFile.name, compressedFile, {
        access: 'public',
        handleUploadUrl: '/api/avatar/upload',
      })

      await updateUserProfileImage(newBlob.url)

      toast.success('Profile image updated successfully!')
      setPreviewUrl(newBlob.url)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image. Please try again.')
      setPreviewUrl(currentImageUrl ?? null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async () => {
    if (!previewUrl) return

    setIsUploading(true)

    try {
      await removeUserProfileImage()
      setPreviewUrl(null)
      toast.success('Profile image removed successfully!')
    } catch (error) {
      console.error('Remove error:', error)
      toast.error('Failed to remove image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>
          Profile Image <span className="text-red-500">*</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-6">
          {/* Image Preview */}
          <div className="relative">
            <div className="border-border bg-muted ring-background aspect-square h-40 w-40 overflow-hidden rounded-full border-4 ring-2">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={userName ?? 'Profile'}
                  className="h-full w-full object-cover object-center"
                  width={160}
                  height={160}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="text-muted-foreground h-20 w-20" />
                </div>
              )}
            </div>

            {/* Remove button */}
            {previewUrl && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-1 -right-1 h-9 w-9 rounded-full shadow-lg"
                onClick={handleRemoveImage}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex w-full flex-col items-center space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={triggerFileSelect}
              disabled={isUploading}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : previewUrl ? 'Change Image' : 'Upload Image'}
            </Button>

            <FieldDescription className="text-center">JPG, PNG or GIF. Max 5MB.</FieldDescription>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  )
}
