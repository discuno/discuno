import { LifeBuoy, Mail } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default function SupportPage() {
  return (
    <div className="text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <LifeBuoy className="text-primary mx-auto h-12 w-12" />
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Help & Support
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Have questions? We&apos;re here to help. Find answers to common questions or get in
            touch with our support team.
          </p>
        </div>

        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
            <CardDescription>Find answers to the most common questions we receive.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="become-mentor">
                <AccordionTrigger className="text-lg">How do I become a mentor?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  To become a mentor, you must have a valid .edu email address. Simply click the
                  &quot;Mentor Sign In&quot; button in the top right corner of the page to get
                  started. You&apos;ll be guided through a quick setup process to create your mentor
                  profile.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="avoid-scams">
                <AccordionTrigger className="text-lg">
                  How can I ensure a safe and productive mentorship experience?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Your safety and satisfaction are our top priorities. We verify all mentors and
                  process payments securely through Stripe. If a mentor is a no-show, or if the
                  session is unsatisfactory, you are eligible for a full refund. We recommend
                  communicating through our platform and never sharing personal financial details.
                  If you have any issues, please contact our support team immediately.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="missing-school">
                <AccordionTrigger className="text-lg">
                  The school I&apos;m looking for isn&apos;t listed. What should I do?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  We are constantly expanding our network of schools. If you don&apos;t see yours,
                  please reach out to our support team with the school&apos;s name and any relevant
                  details. We&apos;ll do our best to get it added to our platform. Your feedback
                  helps us grow and better serve the community.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <h2 className="text-3xl font-bold">Still need help?</h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Our team is ready to answer your questions.
          </p>
          <div className="mt-8 inline-flex rounded-md shadow">
            <a
              href="mailto:support@discuno.com"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md border border-transparent px-6 py-3 text-base font-medium shadow-sm"
            >
              <Mail className="-ml-1 mr-3 h-5 w-5" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
