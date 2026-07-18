import { describe, expect, it } from 'vitest'
import { createFindHref } from './FilterButton'

describe('discovery filter URLs', () => {
  it('carries only supported structured filters', () => {
    expect(
      createFindHref(
        '?school=umich&question=Should+I+switch+majors%3F&checkout=cancelled',
        'major',
        'computer science'
      )
    ).toBe('/find?school=umich&major=computer+science#mentors')
  })

  it('removes a cleared filter without disturbing other supported filters', () => {
    expect(createFindHref('?school=umich&major=computer+science&gradYear=2027', 'major', '')).toBe(
      '/find?school=umich&gradYear=2027#mentors'
    )
  })
})
