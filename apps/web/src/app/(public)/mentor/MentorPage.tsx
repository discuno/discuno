'use client'

import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  Network,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { WaitlistForm } from '~/app/(public)/auth/WaitlistForm'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'

const mentorBenefits = [
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: 'Earn $25-50/hour',
    description: 'Set your own rates and earn money sharing your college experience',
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: 'Flexible Schedule',
    description: "Work around your classes, exams, and social life - you're in control",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'Low Time Commitment',
    description: 'Help students in as little as 15-30 minute sessions when convenient',
  },
  {
    icon: <Network className="h-6 w-6" />,
    title: 'Build Your Network',
    description: 'Connect with ambitious students and professionals for your future career',
  },
]

const careerBenefits = [
  {
    icon: <Briefcase className="h-6 w-6" />,
    title: 'Career Mentorship Access',
    description: 'Get early access to connect with professionals in your dream field',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Leadership Experience',
    description: 'Develop mentoring and communication skills valued by employers',
    color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Professional Network',
    description: 'Build relationships with students who may become valuable connections',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  },
]

const mentorTypes = [
  'Share your college experience',
  'Talk about your major/courses',
  'Discuss campus life & social scene',
  'Help with transfer decisions',
  'Share internship experiences',
  'Talk about study abroad',
  'Discuss greek life',
  'Share dorm/housing tips',
]

const stats = [
  { number: '$35', label: 'Average Hourly Rate' },
  { number: '15 hrs', label: 'Average Weekly Hours' },
  { number: '4.9★', label: 'Average Mentor Rating' },
]

const testimonials = [
  {
    name: 'Sarah M.',
    school: "Stanford '25",
    content:
      "I love helping high schoolers understand what Stanford is really like. It's so rewarding and the flexible schedule works perfectly with my classes.",
    rating: 5,
    earnings: '$1,200/month',
  },
  {
    name: 'Jake L.',
    school: "Harvard '24",
    content:
      "Mentoring has helped me develop leadership skills and I've connected with some amazing future professionals. Plus the extra income is great!",
    rating: 5,
    earnings: '$800/month',
  },
  {
    name: 'Maria R.',
    school: "MIT '26",
    content:
      "I only do a few sessions per week but it's been such a meaningful way to give back. The platform makes it super easy to manage.",
    rating: 5,
    earnings: '$600/month',
  },
]

export const MentorPage = () => {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-green-950 dark:via-blue-950 dark:to-purple-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            {/* Launch Badge */}
            <Badge
              variant="secondary"
              className="mb-8 inline-flex items-center gap-2 border-green-200 bg-green-100 px-4 py-2 text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-200"
            >
              <TrendingUp className="h-4 w-4" />
              Early Mentor Applications Open
            </Badge>

            {/* Company Logo/Name */}
            <div className="mb-8 flex items-center justify-center gap-4">
              <img src="/logos/black-icon-logo.svg" alt="Discuno" width={64} height={64} className="dark:hidden" />
              <img
                src="/logos/white-icon-logo.svg"
                alt="Discuno"
                width={64}
                height={64}
                className="hidden dark:block"
              />
              <h1 className="text-foreground text-4xl font-bold">Discuno</h1>
            </div>

            {/* Hero Heading */}
            <h2 className="text-foreground mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Share Your{' '}
              <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                College Story
              </span>{' '}
              & Get Paid
            </h2>

            {/* Hero Subheading */}
            <p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl leading-relaxed">
              Help the next generation make informed college decisions while earning money on your own schedule.
              It&apos;s mentoring made simple.
            </p>

            {/* Quick Stats */}
            <div className="mx-auto mb-12 grid max-w-2xl grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="mb-1 text-2xl font-bold text-green-600 dark:text-green-400">{stat.number}</div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mx-auto mb-12 max-w-md">
              <WaitlistForm />
            </div>

            {/* What You'll Share */}
            <div className="mx-auto mb-16 max-w-4xl">
              <h3 className="text-foreground mb-6 text-xl font-semibold">What you&apos;ll share:</h3>
              <div className="grid gap-3 text-center sm:grid-cols-2 lg:grid-cols-4">
                {mentorTypes.map((type, index) => (
                  <div
                    key={index}
                    className="bg-card/50 text-muted-foreground rounded-lg border border-green-200 p-3 text-sm backdrop-blur-sm dark:border-green-800"
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Why Become a Discuno Mentor
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              It&apos;s more than just earning extra money - it&apos;s about building your future while helping others.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            {mentorBenefits.map((benefit, index) => (
              <Card
                key={index}
                className="border/50 bg-card/80 relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                    {benefit.icon}
                  </div>
                  <h3 className="text-foreground mb-2 text-lg font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Future Career Benefits */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Invest in Your Future Career
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              As we expand beyond college mentoring, you&apos;ll get exclusive access to connect with professionals in
              your dream field.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {careerBenefits.map((benefit, index) => (
              <Card
                key={index}
                className="border/50 bg-card/80 relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-8 text-center">
                  <div
                    className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${benefit.color}`}
                  >
                    {benefit.icon}
                  </div>
                  <h3 className="text-foreground mb-4 text-xl font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Future Vision */}
          <div className="mt-16 text-center">
            <Card className="border-primary/20 mx-auto max-w-4xl bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-sm dark:from-blue-950 dark:to-purple-950">
              <CardContent className="p-8">
                <div className="mb-4 flex items-center justify-center gap-2">
                  <Target className="text-primary h-6 w-6" />
                  <h3 className="text-foreground text-2xl font-semibold">Coming Soon: Career Mentorship</h3>
                </div>
                <p className="text-muted-foreground mb-6 text-lg">
                  Join as a college mentor now and get early access to connect with professionals in any industry, role,
                  or location when we expand our platform.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Tech', 'Finance', 'Consulting', 'Medicine', 'Law', 'Startups', 'Non-profit', 'Government'].map(
                    field => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">What Our Mentors Say</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Hear from current students who are already making a difference (and extra income).
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {testimonial.earnings}
                    </Badge>
                  </div>
                  <blockquote className="text-muted-foreground mb-4">&ldquo;{testimonial.content}&rdquo;</blockquote>
                  <div>
                    <div className="text-foreground font-semibold">{testimonial.name}</div>
                    <div className="text-muted-foreground text-sm">{testimonial.school}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Getting started is simple. We handle the platform, you share your story.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                1
              </div>
              <h3 className="text-foreground mb-2 text-xl font-semibold">Sign Up</h3>
              <p className="text-muted-foreground">
                Join our waitlist and we&apos;ll contact you when we&apos;re ready to onboard mentors
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-2xl font-bold text-green-600 dark:bg-green-900 dark:text-green-300">
                2
              </div>
              <h3 className="text-foreground mb-2 text-xl font-semibold">Create Profile</h3>
              <p className="text-muted-foreground">
                Share your college, major, experiences, and set your availability & rates
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-2xl font-bold text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                3
              </div>
              <h3 className="text-foreground mb-2 text-xl font-semibold">Start Mentoring</h3>
              <p className="text-muted-foreground">
                Get matched with students and start earning money sharing your experiences
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 py-16 lg:py-24 dark:from-green-950 dark:via-blue-950 dark:to-purple-950">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Start Earning?
          </h2>
          <p className="text-muted-foreground mb-8 text-xl">
            Join our mentor waitlist and be among the first to start sharing your college experience for money.
          </p>

          <div className="mx-auto max-w-md">
            <WaitlistForm variant="cta" />
          </div>

          <p className="text-muted-foreground mt-6 text-sm">
            💰 Earn $25-50/hour • 📅 Flexible schedule • 🚀 Early mentor access • 🔮 Future career opportunities
          </p>
        </div>
      </section>
    </div>
  )
}
