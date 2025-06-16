import sgMail from '@sendgrid/mail'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { env } from '~/env'
import { requireAuth } from '~/lib/auth/auth-utils'
import { db } from '~/server/db'

interface EmailInputFormProps {
  message?: string
  isSuccess?: boolean
  isVerified?: boolean
}

export const EmailInputForm = async ({ isVerified = false }: EmailInputFormProps) => {
  const handleSubmit = async (formData: FormData) => {
    'use server'
    const { user } = await requireAuth()
    const eduEmailRaw = formData.get('email')

    if (typeof eduEmailRaw !== 'string') {
      redirect('/email-verification?status=invalid-email')
    }

    const lowerCaseEduEmail = eduEmailRaw.toLowerCase()

    const userProfile = await db.query.userProfiles.findFirst({
      where: (table, { eq }) => eq(table.eduEmail, lowerCaseEduEmail),
    })

    // Check if the email is already in use
    if (userProfile) {
      redirect('/email-verification?status=email-in-use')
    }

    // Validate the email format
    if (!lowerCaseEduEmail.endsWith('.edu')) {
      redirect('/email-verification?status=invalid-email')
    }

    try {
      // Generate a verification token
      const token = jwt.sign({ userId: user.id, eduEmail: lowerCaseEduEmail }, env.JWT_SECRET, {
        expiresIn: '10m',
      })

      // Construct the verification URL
      const verifyUrl = `${env.NEXT_PUBLIC_BASE_URL}/verify-email/?token=${token}`

      sgMail.setApiKey(env.SENDGRID_API_KEY)

      // Send the verification email
      const msg = {
        to: lowerCaseEduEmail,
        from: env.AUTH_EMAIL_FROM,
        subject: 'Verify Your College Email to Become a Mentor',
        html: `
          <p>Hi ${user.name ?? 'there'},</p>
          <p>Thank you for your interest in becoming a mentor at College Advice.</p>
          <p>Please verify your college email by clicking the link below:</p>
          <a href="${verifyUrl}">Verify Email</a>
          <p>This link will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      }

      await sgMail.send(msg)

      // Redirect to the success page
      redirect('/email-verification?status=sent')
    } catch (error: unknown) {
      // If the error is a NEXT_REDIRECT, rethrow it
      if (
        typeof error === 'object' &&
        error &&
        'digest' in error &&
        typeof error.digest === 'string' &&
        error.digest.startsWith('NEXT_REDIRECT')
      ) {
        throw error
      }

      // Handle other unexpected errors
      console.error('Error sending mentor verification email', error)
      redirect('/email-verification?status=error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-sky-100 to-gray-100 px-4 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="border/40 bg-card text-card-foreground dark:shadow-primary/5 mx-auto max-w-md space-y-6 rounded-lg border p-8 shadow-lg backdrop-blur-md transition-all duration-300 sm:p-12">
        <div className="space-y-2 text-center">
          <h1 className="text-primary text-3xl font-bold">
            {isVerified ? 'Edit Your College Email' : 'Enter Your College Email'}
          </h1>
          <p className="text-muted-foreground">
            We need to verify your email to ensure you are a student.
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">College Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@college.edu"
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full">
            Send Verification Email
          </Button>
        </form>
      </div>
    </div>
  )
}
