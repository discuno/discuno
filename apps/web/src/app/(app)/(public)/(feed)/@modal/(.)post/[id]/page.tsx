import { Calendar, Clock, GraduationCap, School, User } from 'lucide-react'
import { Modal } from '~/app/(app)/(public)/(feed)/@modal/(.)post/[id]/modal'
import { ViewFullProfileButton } from '~/app/(app)/(public)/(feed)/@modal/(.)post/[id]/ViewFullProfileButton'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingInterface'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { getFullProfileByUserId, getPostById } from '~/server/queries'

const PostModal = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id: postId } = await params
  const idAsNumber = Number(postId)

  if (Number.isNaN(idAsNumber)) {
    throw new Error('Invalid post ID')
  }

  const post = await getPostById(idAsNumber)

  // Fetch booking data here instead of in BookingInterface
  let bookingData: BookingData | null = null
  if (post.createdById) {
    const profile = await getFullProfileByUserId(post.createdById)
    if (profile) {
      bookingData = {
        userId: profile.userId,
        calcomUsername: profile.calcomUsername ?? 'fake-username',
        name: profile.name ?? 'Mentor',
        image: profile.image ?? '',
        bio: profile.bio ?? '',
        school: profile.school ?? '',
        major: profile.major ?? '',
      }
    }
  }

  const footer = (
    <div className="flex flex-row gap-2">
      {bookingData && (
        <BookingModal bookingData={bookingData} className="min-w-0 flex-1">
          <Calendar className="mr-2 h-4 w-4" />
          <span className="inline sm:hidden">Book</span>
          <span className="hidden sm:inline">Schedule Meeting</span>
        </BookingModal>
      )}
      <ViewFullProfileButton postId={post.id} className="min-w-0 flex-1" />
    </div>
  )

  return (
    <Modal footer={footer}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Header - Fixed at top */}
        <div className="shrink-0 px-6 pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="border-border ring-background h-16 w-16 shrink-0 border-2 shadow-lg ring-2">
              <AvatarImage src={post.userImage ?? ''} alt={post.name ?? ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {post.name?.charAt(0) ?? 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-balance text-xl font-bold leading-tight sm:text-2xl">
                {post.name ?? 'Student Name'}
              </h1>
              {post.schoolYear && (
                <Badge variant="secondary" className="mt-2">
                  {post.schoolYear}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {/* Academic Info */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">University</p>
                  <p className="text-foreground truncate font-semibold">{post.school}</p>
                </div>
              </div>

              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Major</p>
                  <p className="text-foreground truncate font-semibold">{post.major}</p>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {post.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-foreground font-semibold">About</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{post.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Info - Pinned to bottom above footer */}
        <div className="border-border bg-muted/30 shrink-0 border-t px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Class of {post.graduationYear}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                Joined{' '}
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PostModal
