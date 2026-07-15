import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  decayRankingScores: vi.fn(),
  isAuthorizedCronRequest: vi.fn(),
  processAnalyticsEvents: vi.fn(),
  runExclusiveCron: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: class extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    }
  },
}))

vi.mock('~/lib/cron', () => ({
  isAuthorizedCronRequest: mocks.isAuthorizedCronRequest,
  runExclusiveCron: mocks.runExclusiveCron,
}))

vi.mock('~/server/ranking/service', () => ({
  decayRankingScores: mocks.decayRankingScores,
  processAnalyticsEvents: mocks.processAnalyticsEvents,
}))

import { GET as decayRankingScores } from '~/app/api/cron/decay-ranking-scores/route'
import { GET as processRankingEvents } from '~/app/api/cron/process-ranking-events/route'

describe('ranking cron operational logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAuthorizedCronRequest.mockReturnValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['ranking decay', decayRankingScores],
    ['ranking event processing', processRankingEvents],
  ])('redacts raw failures from the %s route', async (_name, handler) => {
    const privateError = 'database secret for private.user@example.com'
    mocks.runExclusiveCron.mockRejectedValueOnce(new Error(privateError))

    const response = await handler(new Request('https://discuno.test/api/cron/test'))
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Internal Server Error',
    })
    expect(logs).not.toContain(privateError)
    expect(logs).not.toContain('private.user@example.com')
    expect(logs).toContain('errorName')
    expect(logs).toContain('Error')
  })
})
