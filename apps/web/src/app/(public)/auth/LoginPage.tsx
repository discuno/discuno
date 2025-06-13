import { Users, Target, Star, GraduationCap, MessageCircle } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { LoginForm } from './LoginForm'

const features = [
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Expert Mentors',
    description: 'Connect with verified college students and recent graduates from top universities',
  },
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: '1-on-1 Guidance',
    description: 'Get personalized advice tailored to your unique academic goals and interests',
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: 'Success Strategy',
    description: 'Build a comprehensive roadmap for college applications and career planning',
  },
]

const universities = ['Harvard', 'Stanford', 'MIT', 'Yale', 'Princeton', 'Columbia', 'UPenn', 'Dartmouth']

const testimonials = [
  {
    name: 'Sarah Chen',
    role: "Harvard '25",
    content:
      "Discuno helped me navigate the complex application process. My mentor's insights were invaluable for crafting authentic essays.",
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: "Stanford '24",
    content:
      'The personalized guidance I received made all the difference. I felt confident and prepared throughout my entire journey.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: "MIT '26",
    content: 'Having a mentor who understood my goals helped me focus on what truly mattered for my applications.',
    rating: 5,
  },
]

export function LoginPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="from-background via-muted/30 to-background relative overflow-hidden bg-gradient-to-br">
        <div className="bg-grid-pattern absolute inset-0 opacity-5" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Column - Content */}
            <div className="text-left">
              {/* Launch Badge */}
              <Badge variant="secondary" className="mb-6 inline-flex items-center gap-2 px-4 py-2">
                <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                Launching Soon - Early Access Available
              </Badge>

              {/* Company Logo/Name */}
              <div className="mb-8 flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h1 className="text-foreground text-3xl font-bold">Discuno</h1>
              </div>

              {/* Hero Heading */}
              <h2 className="text-foreground mb-6 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your{' '}
                <span className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent">
                  College Journey
                </span>{' '}
                Starts Here
              </h2>

              {/* Hero Subheading */}
              <p className="text-muted-foreground mb-8 max-w-xl text-lg">
                Connect with experienced mentors from top universities. Get personalized guidance, expert advice, and
                proven strategies to succeed in your college applications.
              </p>

              {/* Trust Indicators */}
              <div className="mb-8 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">500+</div>
                  <div className="text-muted-foreground text-sm">Expert Mentors</div>
                </div>
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">95%</div>
                  <div className="text-muted-foreground text-sm">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">50+</div>
                  <div className="text-muted-foreground text-sm">Universities</div>
                </div>
              </div>

              {/* University Logos */}
              <div className="hidden lg:block">
                <p className="text-muted-foreground mb-4 text-sm">Trusted by students from:</p>
                <div className="flex flex-wrap gap-3">
                  {universities.map((uni, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {uni}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="lg:flex lg:justify-end">
              <div className="w-full max-w-md">
                <LoginForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Why Choose Discuno?</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              We provide the guidance and support you need to make informed decisions about your academic future.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-foreground mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Success Stories</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Hear from students who achieved their college dreams with our guidance.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="fill-primary text-primary h-4 w-4" />
                    ))}
                  </div>
                  <blockquote className="text-muted-foreground mb-4">&ldquo;{testimonial.content}&rdquo;</blockquote>
                  <div>
                    <div className="text-foreground font-semibold">{testimonial.name}</div>
                    <div className="text-muted-foreground text-sm">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="from-primary/10 via-accent/10 to-primary/10 bg-gradient-to-r py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Start Your Journey?
          </h2>
          <p className="text-muted-foreground mb-8 text-xl">
            Join thousands of students who have successfully navigated their college applications with expert guidance.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <LoginForm variant="cta" />
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Early access available • No credit card required • Verified mentors only
          </p>
        </div>
      </section>
    </div>
  )
}
