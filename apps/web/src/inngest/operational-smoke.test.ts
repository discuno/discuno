import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildInngestOperationalSmokeAcknowledgement,
  INNGEST_OPERATIONAL_SMOKE_EVENT,
  verifyInngestInvocation,
} from './operational-smoke'

describe('Inngest operational smoke function', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is registered only for the dedicated smoke event without retries', () => {
    expect(verifyInngestInvocation.opts).toMatchObject({
      id: 'verify-inngest-invocation',
      triggers: [{ event: INNGEST_OPERATIONAL_SMOKE_EVENT }],
      retries: 0,
    })
  })

  it('acknowledges the deployment with non-sensitive, bounded metadata', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '1234567890abcdef1234567890abcdef12345678')

    expect(buildInngestOperationalSmokeAcknowledgement()).toEqual({
      ok: true,
      environment: 'preview',
      commitSha: '1234567890ab',
    })
  })
})
