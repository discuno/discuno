import { Calendar, Clock, ExternalLink, GraduationCap, School, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Modal } from '~/app/(app)/(public)/(feed)/@modal/(.)img/[id]/modal'
import { BookingInterface } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingInterface'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { getPostById } from '~/server/queries'

const PostModal = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id: postId } = await params
  const idAsNumber = Number(postId)

  if (Number.isNaN(idAsNumber)) {
    throw new Error('Invalid post ID')
  }

  const post = await getPostById(idAsNumber)

  return (
    <Modal>
      <div className="mx-auto max-w-2xl">
        {/* Header Section */}
        <div className="relative">
          {/* Hero Image */}
          <div className="relative h-64 w-full overflow-hidden rounded-t-xl">
            <Image
              src={post.userImage ?? '/images/placeholder.jpg'}
              alt={post.name ?? 'Student profile'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Profile Avatar Overlay */}
            <div className="absolute bottom-4 left-4 flex items-end gap-3">
              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                <AvatarImage src={post.userImage ?? ''} alt={post.name ?? ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {post.name?.charAt(0) ?? 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="mb-2 text-white">
                <h1 className="text-2xl font-bold drop-shadow-lg">{post.name ?? 'Student Name'}</h1>
                <Badge variant="secondary" className="mt-1 border-white/30 bg-white/20 text-white">
                  {post.schoolYear}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6 p-6">
          {/* Academic Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
              <School className="text-primary h-5 w-5" />
              <div>
                <p className="text-muted-foreground text-sm">University</p>
                <p className="text-foreground font-semibold">{post.school}</p>
              </div>
            </div>

            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
              <GraduationCap className="text-primary h-5 w-5" />
              <div>
                <p className="text-muted-foreground text-sm">Major</p>
                <p className="text-foreground font-semibold">{post.major}</p>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {post.description && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="text-primary h-4 w-4" />
                <h3 className="text-foreground font-semibold">About</h3>
              </div>
              <p className="text-muted-foreground pl-6 leading-relaxed">{post.description}</p>
            </div>
          )}

          <Separator />

          {/* Timeline Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Class of {post.graduationYear}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Joined{' '}
                {new Date(post.createdAt ?? '').toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            {post.createdById && (
              <BookingInterface variant="modal" className="flex-1" userId={post.createdById}>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Meeting
              </BookingInterface>
            )}

            <Button variant="outline" asChild className="flex-1">
              <Link href={`/img/${post.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PostModal
