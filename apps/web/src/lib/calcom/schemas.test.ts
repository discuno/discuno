import { describe, expect, it } from 'vitest'
import {
  CalcomSafeMeetingUrlSchema,
  CalcomWebhookListResponseSchema,
  CalcomWebhookResponseSchema,
} from '~/lib/calcom/schemas'

describe('Cal.com webhook resource schemas', () => {
  it('accepts current UUID webhook IDs without coercion', () => {
    const id = 'abffec74-2f4a-486b-a8c4-9bc403da31d2'

    expect(
      CalcomWebhookResponseSchema.parse({
        status: 'success',
        data: {
          id,
          subscriberUrl: 'https://discuno.com/api/webhooks/cal?connection=opaque',
          active: true,
        },
      }).data.id
    ).toBe(id)
  })

  it('normalizes historical numeric webhook IDs for cleanup compatibility', () => {
    expect(
      CalcomWebhookListResponseSchema.parse({
        status: 'success',
        data: [
          {
            id: 202,
            subscriberUrl: 'https://discuno.com/api/webhooks/cal',
            active: false,
          },
        ],
      }).data[0]?.id
    ).toBe('202')
  })
})

describe('Cal.com meeting location normalization', () => {
  it('preserves safe web meeting URLs', () => {
    expect(CalcomSafeMeetingUrlSchema.parse('https://app.cal.com/video/booking')).toBe(
      'https://app.cal.com/video/booking'
    )
  })

  it.each(['+1 (202) 555-0199', '100 Main Street', 'javascript:alert(1)'])(
    'does not expose a non-web Cal.com location as a link (%s)',
    location => {
      expect(CalcomSafeMeetingUrlSchema.parse(location)).toBeUndefined()
    }
  )

  it('treats an empty provider location as absent', () => {
    expect(CalcomSafeMeetingUrlSchema.parse('   ')).toBeUndefined()
  })

  it('keeps the meeting URL contract aligned to the 2048-character database column', () => {
    const prefix = 'https://meet.example.com/'
    const maximumUrl = `${prefix}${'a'.repeat(2_048 - prefix.length)}`
    const oversizedUrl = `${maximumUrl}a`

    expect(CalcomSafeMeetingUrlSchema.parse(maximumUrl)).toBe(maximumUrl)
    expect(() => CalcomSafeMeetingUrlSchema.parse(oversizedUrl)).toThrow()
  })
})
