import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ after: vi.fn() }))

vi.mock('next/server', () => ({ after: mocks.after }))

import { scheduleAuthBackgroundTask } from './background-tasks'

describe('Better Auth background tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hands pending work to Next without waiting for it to settle', async () => {
    let resolveTask: (() => void) | undefined
    const task = new Promise<void>(resolve => {
      resolveTask = resolve
    })

    scheduleAuthBackgroundTask(task)

    expect(mocks.after).toHaveBeenCalledOnce()
    const scheduledTask = mocks.after.mock.calls[0]?.[0] as Promise<unknown>

    resolveTask?.()
    await expect(scheduledTask).resolves.toBeUndefined()
  })

  it('redacts rejected background work before Next observes it', async () => {
    const privateDetail = 'delivery failed for private.user@example.edu with OTP 123456'

    scheduleAuthBackgroundTask(Promise.reject(new TypeError(privateDetail)))

    const scheduledTask = mocks.after.mock.calls[0]?.[0] as Promise<unknown>
    await expect(scheduledTask).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith('[Auth background task] Failed', {
      errorKind: 'TypeError',
    })
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).not.toContain(privateDetail)
    expect(logged).not.toContain('private.user@example.edu')
    expect(logged).not.toContain('123456')
  })
})
