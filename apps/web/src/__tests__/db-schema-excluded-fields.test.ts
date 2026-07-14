import { describe, expect, it } from 'vitest'
import { updateMentorEventTypeSchema } from '~/lib/schemas/db'

describe('database input schema exclusions', () => {
  it('allows a partial mentor event-type update without excluded keys', () => {
    expect(
      updateMentorEventTypeSchema.parse({ isEnabled: true, customPrice: 5_000 })
    ).toMatchObject({
      isEnabled: true,
      customPrice: 5_000,
    })
  })

  it('rejects attempts to update Cal.com-owned event-type fields', () => {
    expect(() => updateMentorEventTypeSchema.parse({ title: 'Forged title' })).toThrow()
  })
})
