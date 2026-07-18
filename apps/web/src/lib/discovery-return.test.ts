import { describe, expect, it } from 'vitest'
import { createDiscoveryReturnHref, sanitizeDiscoveryReturnHref } from './discovery-return'

describe('discovery return links', () => {
  it('carries only supported structured filters', () => {
    expect(
      createDiscoveryReturnHref({
        school: 'umich',
        major: 'computer science',
        gradYear: '2027',
      })
    ).toBe('/find?school=umich&major=computer+science&gradYear=2027#mentors')
  })

  it('strips sensitive and unsupported query values', () => {
    expect(
      sanitizeDiscoveryReturnHref(
        '/find?school=umich&question=Should+I+switch%3F&checkout=cancelled#mentors'
      )
    ).toBe('/find?school=umich#mentors')
  })

  it('rejects external and unrelated return targets', () => {
    expect(sanitizeDiscoveryReturnHref('https://example.com/find?school=umich')).toBe(
      '/find#mentors'
    )
    expect(sanitizeDiscoveryReturnHref('/support?school=umich')).toBe('/find#mentors')
  })
})
