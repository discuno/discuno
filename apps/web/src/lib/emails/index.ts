import 'server-only'

import { Resend } from 'resend'
import { env } from '~/env'

export const resend = new Resend(env.RESEND_API_KEY)

type EmailPayload = Parameters<typeof resend.emails.send>[0]

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailDeliveryError'
  }
}

/** Send one transactional email, surfacing Resend API errors and deduplicating retries. */
export const sendEmail = async (payload: EmailPayload, idempotencyKey: string): Promise<string> => {
  if (!idempotencyKey || idempotencyKey.length > 256) {
    throw new EmailDeliveryError('Invalid email idempotency key')
  }

  const { data, error } = await resend.emails.send(payload, { idempotencyKey })
  if (error) {
    throw new EmailDeliveryError(`Resend rejected the email request (${error.name})`)
  }
  if (!data.id) throw new EmailDeliveryError('Resend accepted no email ID')

  return data.id
}
