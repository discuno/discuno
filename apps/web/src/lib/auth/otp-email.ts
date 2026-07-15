import 'server-only'

import { render } from 'react-email'
import { authErrorKind, createOtpDeliveryIdempotencyKey } from '~/lib/auth/security'
import { sendEmail } from '~/lib/emails'
import { OtpEmail } from '~/lib/emails/templates/OtpEmail'

export type AuthOtpEmailType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'

type AuthOtpEmailInput = {
  authSecret: string
  email: string
  from: string
  otp: string
  type: AuthOtpEmailType
}

const OTP_EMAIL_SUBJECTS: Readonly<Record<AuthOtpEmailType, string>> = {
  'change-email': 'Confirm your new email',
  'email-verification': 'Verify your email',
  'forget-password': 'Reset your password',
  'sign-in': 'Sign in to Discuno',
}

/**
 * Complete OTP rendering and provider delivery inside Better Auth's deferred
 * task. Failures are operationally visible without logging the address, code,
 * provider response, or error message.
 */
export const sendAuthOtpEmail = async ({
  authSecret,
  email,
  from,
  otp,
  type,
}: AuthOtpEmailInput): Promise<void> => {
  try {
    const html = await render(OtpEmail({ code: otp, host: 'Discuno' }))

    await sendEmail(
      {
        from,
        to: email,
        subject: OTP_EMAIL_SUBJECTS[type],
        html,
      },
      createOtpDeliveryIdempotencyKey(email, otp, type, authSecret)
    )
  } catch (error) {
    console.error('[Auth OTP] Email delivery failed', { errorKind: authErrorKind(error) })
  }
}
