import { and } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it, vi } from 'vitest'

vi.mock('~/env', () => ({ env: { PAYMENTS_ENABLED: false } }))

vi.mock('~/server/db', async () => {
  const { drizzle } = await import('drizzle-orm/pg-proxy')
  return {
    db: drizzle(async () => ({ rows: [] })),
  }
})

import { readyCalcomOAuthConditions } from '~/server/dal/calcom'
import { getActivePostConditions } from '~/server/dal/posts'

describe('public mentor Cal.com readiness', () => {
  it('uses the complete booking connection contract before publishing a mentor', () => {
    const publicationConditions = getActivePostConditions()

    for (const readinessCondition of readyCalcomOAuthConditions) {
      expect(publicationConditions).toContain(readinessCondition)
    }

    const publicationPredicate = and(...publicationConditions)
    expect(publicationPredicate).toBeDefined()
    if (!publicationPredicate) throw new Error('Expected a public mentor publication predicate')

    const compiled = new PgDialect({ casing: 'snake_case' }).sqlToQuery(publicationPredicate).sql
    expect(compiled).toContain('"webhook_id" is not null')
    expect(compiled).toContain('"webhook_secret" is not null')
    expect(compiled).toContain('"webhook_route_key" is not null')
    expect(compiled).toContain('"webhook_route_key_hash" is not null')
  })
})
