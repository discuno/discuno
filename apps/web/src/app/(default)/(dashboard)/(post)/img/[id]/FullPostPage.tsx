import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Mail,
  MessageCircle,
  School,
  Share2,
  Star,
  User,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookingInterface } from '~/app/(default)/(dashboard)/(post)/(booking)/BookingInterface'
import type { Card } from '~/app/types'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { CardContent, CardHeader, CardTitle, Card as UICard } from '~/components/ui/card'
import { getPostById } from '~/server/queries'

export const PostPage = async ({ id }: { id: string }) => {
  const postId = Number(id)

  if (Number.isNaN(postId)) {
    return notFound()
  }

  try {
    const post: Card = await getPostById(postId)

    return (
      <div className="from-background via-muted/10 to-background min-h-screen bg-gradient-to-br">
        {/* Navigation */}
        <div className="bg-background/80 border/50 sticky top-0 z-40 border-b backdrop-blur-lg">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" asChild className="gap-2">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Profile
                </Button>
                <Button variant="outline" size="sm">
                  <Star className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Full Width */}
        <div className="relative h-96 w-full overflow-hidden">
          <Image
            src={post.userImage ?? '/images/placeholder.jpg'}
            alt={post.name ?? 'Student profile'}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Profile Info Overlay - Centered */}
          <div className="absolute inset-0 flex items-end justify-center">
            <div className="container mx-auto px-6 pb-12">
              <div className="flex flex-col items-center text-center text-white">
                <Avatar className="mb-6 h-32 w-32 border-4 border-white shadow-2xl">
                  <AvatarImage src={post.userImage ?? ''} alt={post.name ?? ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                    {post.name?.charAt(0) ?? 'S'}
                  </AvatarFallback>
                </Avatar>

                <h1 className="mb-4 text-5xl font-bold drop-shadow-lg">
                  {post.name ?? 'Student Name'}
                </h1>

                <div className="mb-4 flex flex-wrap justify-center gap-3">
                  <Badge
                    variant="secondary"
                    className="border-white/30 bg-white/20 px-4 py-2 text-lg text-white"
                  >
                    {post.school}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-primary/20 border-primary/30 px-4 py-2 text-lg text-white"
                  >
                    {post.major}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-accent/20 border-accent/30 px-4 py-2 text-lg text-white"
                  >
                    Class of {post.graduationYear}
                  </Badge>
                </div>

                <p className="max-w-2xl text-xl text-white/90">
                  {post.description?.substring(0, 120)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* About Section */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <User className="text-primary h-6 w-6" />
                    </div>
                    About {post.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {post.description}
                  </p>
                </CardContent>
              </UICard>

              {/* Academic Journey */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <BookOpen className="text-primary h-6 w-6" />
                    </div>
                    Academic Journey
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-full p-3">
                        <School className="text-primary h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{post.school}</h3>
                        <p className="text-muted-foreground">Current University</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Pursuing excellence in higher education
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-full p-3">
                        <GraduationCap className="text-primary h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{post.major}</h3>
                        <p className="text-muted-foreground">Field of Study</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Specializing in cutting-edge research and applications
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </UICard>

              {/* Experience & Achievements */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Award className="text-primary h-6 w-6" />
                    </div>
                    Experience & Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="bg-muted/30 rounded-lg p-6 text-center">
                      <div className="text-primary mb-2 text-3xl font-bold">
                        {Math.max(
                          0,
                          new Date().getFullYear() -
                            (post.graduationYear ?? new Date().getFullYear())
                        )}
                        +
                      </div>
                      <div className="text-muted-foreground text-sm">Years Experience</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-6 text-center">
                      <div className="text-primary mb-2 text-3xl font-bold">{post.schoolYear}</div>
                      <div className="text-muted-foreground text-sm">Current Academic Year</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-6 text-center">
                      <div className="text-primary mb-2 text-3xl font-bold">
                        {post.major?.split(' ').length ?? 1}
                      </div>
                      <div className="text-muted-foreground text-sm">Areas of Expertise</div>
                    </div>
                  </div>
                </CardContent>
              </UICard>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Connect with {post.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BookingInterface variant="modal" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </BookingInterface>

                  <Button variant="outline" className="w-full">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>

                  <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Contact
                  </Button>
                </CardContent>
              </UICard>

              {/* Profile Stats */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-muted-foreground h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">Graduation Year</p>
                      <p className="font-semibold">{post.graduationYear}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="text-muted-foreground h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">Member Since</p>
                      <p className="font-semibold">
                        {new Date(post.createdAt ?? '').toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="text-muted-foreground h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">Academic Level</p>
                      <p className="font-semibold">{post.schoolYear}</p>
                    </div>
                  </div>
                </CardContent>
              </UICard>

              {/* Availability Preview */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Response Time</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Usually within 24h
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Timezone</span>
                      <span className="text-sm font-medium">EST (UTC-5)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Preferred Meeting</span>
                      <span className="text-sm font-medium">Video Call</span>
                    </div>
                  </div>
                </CardContent>
              </UICard>

              {/* Similar Mentors */}
              <UICard className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Similar Mentors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      Discover other mentors from {post.school} studying {post.major}
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Browse Similar Profiles
                    </Button>
                  </div>
                </CardContent>
              </UICard>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error fetching post:', error)
    return notFound()
  }
}
