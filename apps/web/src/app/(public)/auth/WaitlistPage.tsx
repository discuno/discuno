import {
  Rocket,
  Sparkles,
  Shield,
  Users,
  GraduationCap,
  Target,
  MessageCircle,
  CheckCircle,
  Mail,
  MapPin,
  Coffee,
  BookOpen,
  Eye,
} from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { WaitlistForm } from '~/app/(public)/auth/WaitlistForm'
import Image from 'next/image'

const features = [
  {
    icon: <Eye className="h-6 w-6" />,
    title: 'Insider Access',
    description:
      'Get the real scoop on campus life, dining halls, dorms, and social scenes directly from current students',
  },
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: 'Ask Anything',
    description: 'No question too small - from course difficulty to weekend vibes, our mentors share honest insights',
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: 'Beyond Applications',
    description: 'Connect with mentors in your dream major, clubs, cities, or career paths for personalized guidance',
  },
]

// Updated stats for pre-launch company
const stats = [
  { number: '500+', label: 'Student Insiders Ready' },
  { number: '50+', label: 'Top Universities & Programs' },
  { number: 'Q3 2025', label: 'Expected Launch' },
]

const benefits = [
  'Early access to platform features',
  'Priority mentor matching',
  'Free insider consultation credits',
  'Exclusive campus insights & resources',
]

const insiderQuestions = [
  "What's the food really like at Harvard?",
  'How hard is pre-med at Stanford?',
  "What's the social scene like at Yale?",
  'Should I rush at UPenn?',
  'Best dorms at Columbia?',
  'Is MIT as stressful as they say?',
]

export const WaitlistPage = () => {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="from-primary/5 via-accent/5 to-primary/5 absolute inset-0 bg-gradient-to-br" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(37,99,235,0.1),transparent_50%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            {/* Launch Badge */}
            <Badge
              variant="secondary"
              className="border-primary/20 bg-primary/10 text-primary mb-8 inline-flex items-center gap-2 px-4 py-2"
            >
              <Rocket className="h-4 w-4" />
              Coming Soon - Join the Waitlist
            </Badge>

            <div className="mb-8 flex items-center justify-center gap-4">
              {/* Company Logo/Name */}
              <Image src="/logos/black-icon-logo.svg" alt="Discuno" width={64} height={64} className="dark:hidden" />
              <Image
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
              Get the{' '}
              <span className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent">
                Inside Scoop
              </span>{' '}
              on College
            </h2>

            {/* Hero Subheading */}
            <p className="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl leading-relaxed">
              Connect with current students at top universities for honest insights about campus life, academics, and
              everything in between. No fluff, just real experiences.
            </p>

            {/* Floating Questions Preview */}
            <div className="mx-auto mb-12 max-w-4xl">
              <div className="mb-8 grid gap-3 text-center sm:grid-cols-2 lg:grid-cols-3">
                {insiderQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="bg-card/50 border-primary/20 text-muted-foreground rounded-lg border p-3 text-sm backdrop-blur-sm"
                  >
                    &ldquo;{question}&rdquo;
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto mb-12 max-w-md">
              <WaitlistForm />
            </div>

            {/* Trust Indicators */}
            <div className="mx-auto mb-16 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-primary mb-2 text-3xl font-bold">{stat.number}</div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Early Access Benefits */}
            <Card className="border-primary/20 bg-card/50 mx-auto max-w-2xl backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center justify-center gap-2">
                  <Sparkles className="text-primary h-5 w-5" />
                  <h3 className="text-foreground text-xl font-semibold">Early Access Benefits</h3>
                </div>
                <div className="grid gap-3 text-left">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="text-primary h-5 w-5 flex-shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Why Choose Discuno</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Skip the college tours. Get real answers from students who are actually living your dream college
              experience.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border/50 bg-card/80 relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-8 text-center">
                  <div className="bg-primary/10 text-primary mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
                    {feature.icon}
                  </div>
                  <h3 className="text-foreground mb-4 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Perfect For</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Whether you&apos;re just starting your college journey or looking ahead to your career, we connect you
              with the right insiders.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border/50 bg-card/80 text-center backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">High School Students</h3>
                <p className="text-muted-foreground text-sm">
                  Research colleges, understand admissions, and get the real campus experience
                </p>
              </CardContent>
            </Card>

            <Card className="border/50 bg-card/80 text-center backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Transfer Students</h3>
                <p className="text-muted-foreground text-sm">
                  Learn about new campuses, programs, and what to expect before transferring
                </p>
              </CardContent>
            </Card>

            <Card className="border/50 bg-card/80 text-center backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                  <Coffee className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Current Students</h3>
                <p className="text-muted-foreground text-sm">
                  Connect with upperclassmen in your major or explore new opportunities
                </p>
              </CardContent>
            </Card>

            <Card className="border/50 bg-card/80 text-center backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Career Exploration</h3>
                <p className="text-muted-foreground text-sm">
                  Connect with mentors in your dream career, industry, or location
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">What&apos;s Coming</h2>
            <p className="text-muted-foreground mb-12 text-lg">
              We&apos;re building the ultimate platform for connecting with insiders across colleges and careers
            </p>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Phase 1: College Focus</h3>
                <p className="text-muted-foreground text-sm">
                  Connect with current students for insider campus insights and real experiences
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Phase 2: Career Expansion</h3>
                <p className="text-muted-foreground text-sm">
                  Match with professionals in any industry, role, or location worldwide
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">Phase 3: AI Matching</h3>
                <p className="text-muted-foreground text-sm">
                  Smart algorithms to find your perfect mentor based on your unique goals
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="from-primary/10 via-accent/10 to-primary/10 bg-gradient-to-r py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="bg-primary/10 text-primary mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Get Early Access to Insider Insights
          </h2>
          <p className="text-muted-foreground mb-8 text-xl">
            Join our waitlist and be the first to connect with student insiders when we launch. No spam, just real
            insights.
          </p>

          <div className="mx-auto max-w-md">
            <WaitlistForm variant="cta" />
          </div>

          <p className="text-muted-foreground mt-6 text-sm">
            🔒 Your email is safe with us • 📧 Unsubscribe anytime • 🚀 Early access guaranteed
          </p>
        </div>
      </section>
    </div>
  )
}
