import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { env } from '~/env'

export async function POST(req: Request) {
  const signature = req.headers.get('x-cal-signature-256') ?? ''
  const bodyText = await req.text()

  // Verify signature authenticity
  const expectedSignature = crypto
    .createHmac('sha256', env.X_CAL_SECRET_KEY)
    .update(bodyText)
    .digest('hex')

  if (
    !crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf8'), Buffer.from(signature, 'utf8'))
  ) {
    console.error('❌ Webhook signature verification failed for Cal.com payload')
    return new Response('Invalid signature', { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(bodyText)
  } catch (err) {
    console.error('❌ Failed to parse Cal.com webhook payload:', err)
    return new Response('Invalid payload', { status: 400 })
  }

  const { triggerEvent } = event
  console.log(`✅ Received Cal.com webhook event: ${triggerEvent}`)

  // TODO: Implement handling for specific triggerEvent types

  return NextResponse.json({ received: true })
}
