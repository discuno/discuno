'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users,
  Target,
  Heart,
  Shield,
  Zap,
  TrendingUp,
  Award,
  GraduationCap,
  Lightbulb,
} from 'lucide-react'
import { Icons } from '~/components/shared/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

const values = [
  {
    icon: Heart,
    title: 'Student-First',
    description: 'Every decision we make prioritizes the student experience and learning outcomes.',
  },
  {
    icon: Shield,
    title: 'Trust & Safety',
    description:
      'We verify all mentors and ensure secure, transparent transactions for peace of mind.',
  },
  {
    icon: Lightbulb,
    title: 'Quality Mentorship',
    description: 'We foster meaningful connections that drive real growth and career advancement.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Growth',
    description: 'We constantly improve our platform based on feedback from students and mentors.',
  },
]

const stats = [
  { value: '1,000+', label: 'Active Students' },
  { value: '500+', label: 'Expert Mentors' },
  { value: '50+', label: 'Universities' },
  { value: '10,000+', label: 'Sessions Booked' },
]

const AboutPage = () => {
  const { theme } = useTheme()

  return (
    <div className="text-foreground min-h-screen">
      {/* Hero Section */}
      <div className="from-primary/5 to-background border-b bg-gradient-to-b">
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <GraduationCap className="text-primary h-8 w-8" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              About Discuno
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg sm:text-xl">
              Empowering students through peer-to-peer mentorship and meaningful connections.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Mission Section */}
        <section className="mb-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <div className="bg-primary/10 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                <Target className="text-primary h-6 w-6" />
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight">Our Mission</h2>
              <p className="text-muted-foreground mb-4 text-lg leading-relaxed">
                Discuno exists to democratize access to mentorship by connecting college students
                with experienced peers who have walked the same path. We believe that the best
                guidance often comes from those who recently faced the same challenges.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Whether you&apos;re navigating course selection, preparing for internships, or
                planning your career, our platform makes it easy to find and connect with mentors
                who understand your journey.
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="bg-primary/10 mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg">
                    <Zap className="text-primary h-5 w-5" />
                  </div>
                  <CardTitle className="text-2xl">Why Discuno?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Award className="text-primary mt-1 h-5 w-5 shrink-0" />
                    <div>
                      <h3 className="font-semibold">Verified Mentors</h3>
                      <p className="text-muted-foreground text-sm">
                        All mentors are verified students with .edu email addresses
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Shield className="text-primary mt-1 h-5 w-5 shrink-0" />
                    <div>
                      <h3 className="font-semibold">Secure Payments</h3>
                      <p className="text-muted-foreground text-sm">
                        Industry-leading payment processing through Stripe
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Users className="text-primary mt-1 h-5 w-5 shrink-0" />
                    <div>
                      <h3 className="font-semibold">Flexible Scheduling</h3>
                      <p className="text-muted-foreground text-sm">
                        Book sessions that fit your schedule with integrated calendar management
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="mb-20">
          <div className="from-primary/10 via-primary/5 to-primary/10 rounded-2xl border bg-gradient-to-r p-8 sm:p-12">
            <h2 className="mb-8 text-center text-3xl font-bold">Our Impact</h2>
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-primary mb-2 text-4xl font-bold sm:text-5xl">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground text-sm font-medium sm:text-base">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-20">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Our Values</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              These core principles guide everything we do at Discuno
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(value => {
              const Icon = value.icon
              return (
                <Card key={value.title} className="border-border/50">
                  <CardHeader>
                    <div className="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-lg">
                      <Icon className="text-primary h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{value.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {value.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-20">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Meet the Team</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Built by a University of Michigan student passionate about making mentorship
              accessible
            </p>
          </div>
          <div className="flex justify-center">
            <Card className="border-border/50 max-w-sm">
              <CardHeader className="text-center">
                <div className="from-primary/20 to-primary/5 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br">
                  <span className="text-primary text-3xl font-bold">B</span>
                </div>
                <CardTitle className="text-lg">Brad</CardTitle>
                <CardDescription>Founder & Developer</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-center text-sm">
                Computer Science student at the University of Michigan building tools to help
                students connect and grow.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Connect With Us Section */}
        <section className="mb-20">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Connect With Us</CardTitle>
              <CardDescription className="text-base">
                Follow our journey and stay updated on the latest features and news
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <div className="flex items-center gap-6">
                <a
                  href="https://linkedin.com/company/discuno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="LinkedIn"
                >
                  <Icons.linkedin className="h-8 w-8" />
                </a>
                <a
                  href="https://instagram.com/discunoapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Icons.instagram className="h-8 w-8" />
                </a>
                <a
                  href="https://x.com/discuno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="X (Twitter)"
                >
                  <Icons.twitter className="h-8 w-8" />
                </a>
                <a
                  href="https://github.com/discuno/discuno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="GitHub"
                >
                  <Icons.github className="h-8 w-8" />
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sponsors Section */}
        <section>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Thank You to Our Sponsors</CardTitle>
              <CardDescription className="text-base">
                Our open-source journey is made possible by the generous support of our sponsors
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Link
                href="https://cal.com/discuno/30min?utm_source=banner&utm_campaign=oss"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-80"
              >
                <Image
                  src={theme === 'dark' ? '/book-with-cal-dark.svg' : '/book-with-cal-light.svg'}
                  alt="Book us with Cal.com"
                  width={200}
                  height={50}
                />
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

export default AboutPage
