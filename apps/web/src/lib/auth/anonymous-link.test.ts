import { beforeEach, describe, expect, it, vi } from 'vitest'

type AnonymousLinkContext = {
  anonymousUser: { user: { id: string; email: string } }
  newUser: { user: { id: string; email: string } }
}

type AnonymousPluginOptions = {
  onLinkAccount: (context: AnonymousLinkContext) => Promise<void>
}

type CapturedAuthOptions = {
  databaseHooks?: {
    session?: {
      create?: {
        before?: (session: { userId: string }) => Promise<void>
      }
    }
    user?: {
      create?: {
        after?: (user: { id: string; email: string; image?: string | null }) => Promise<void>
      }
    }
  }
}

const mocks = vi.hoisted(() => {
  const writtenValues: Array<Record<string, unknown>> = []
  const where = vi.fn().mockResolvedValue(undefined)
  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) })),
    })),
    query: {
      anonymousUserLink: { findFirst: vi.fn() },
      user: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        writtenValues.push(values)
        return { where }
      }),
    })),
    delete: vi.fn(() => ({ where })),
  }

  return {
    anonymousOptions: undefined as AnonymousPluginOptions | undefined,
    authOptions: undefined as CapturedAuthOptions | undefined,
    reconcileMentorAccessForUser: vi.fn().mockResolvedValue({ status: 'ready' }),
    rootInsertValues: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
    tx,
    writtenValues,
  }
})

vi.mock('~/env', () => ({
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_BASE_URL: 'https://discuno.test',
    NEXT_PUBLIC_APP_URL: 'https://discuno.test',
    BETTER_AUTH_URL: 'https://discuno.test',
    BETTER_AUTH_PRODUCTION_URL: 'https://discuno.com',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    BETTER_AUTH_SECRETS: undefined,
    BETTER_AUTH_TRUSTED_ORIGINS: undefined,
    AUTH_GOOGLE_ID: 'google-id',
    AUTH_GOOGLE_SECRET: 'google-secret',
    AUTH_MICROSOFT_ENTRA_ID_ID: 'microsoft-id',
    AUTH_MICROSOFT_ENTRA_ID_SECRET: 'microsoft-secret',
    AUTH_EMAIL_FROM: 'Discuno <auth@discuno.test>',
    OAUTH_PROXY_SECRET: 'b'.repeat(32),
  },
}))
vi.mock('better-auth', () => ({
  betterAuth: vi.fn((options: CapturedAuthOptions) => {
    mocks.authOptions = options
    return {}
  }),
}))
vi.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: vi.fn(() => ({})) }))
vi.mock('better-auth/next-js', () => ({ nextCookies: vi.fn(() => ({})) }))
vi.mock('better-auth/plugins', () => ({
  admin: vi.fn(() => ({})),
  anonymous: vi.fn((options: AnonymousPluginOptions) => {
    mocks.anonymousOptions = options
    return {}
  }),
  emailOTP: vi.fn(() => ({})),
  oAuthProxy: vi.fn(() => ({})),
  oneTap: vi.fn(() => ({})),
  username: vi.fn(() => ({})),
}))
vi.mock('react-email', () => ({ render: vi.fn().mockResolvedValue('<p>code</p>') }))
vi.mock('~/lib/auth/permissions', () => ({
  ac: {},
  admin: {},
  mentor: {},
  user: {},
}))
vi.mock('~/lib/auth/rate-limit-storage', () => ({ betterAuthRateLimitStorage: {} }))
vi.mock('~/lib/blob', () => ({ downloadAndUploadProfileImage: vi.fn() }))
vi.mock('~/lib/emails', () => ({ sendEmail: vi.fn() }))
vi.mock('~/lib/emails/templates/OtpEmail', () => ({ OtpEmail: vi.fn() }))
vi.mock('~/lib/rate-limiter', () => ({
  authOtpRecipientRatelimit: { limit: vi.fn().mockResolvedValue({ success: true }) },
}))
vi.mock('~/server/auth/domain-cache', () => ({ getAllowedDomains: vi.fn() }))
vi.mock('~/server/auth/mentor-access', () => ({
  extractEduDomainPrefix: vi.fn(() => 'umich'),
  reconcileMentorAccessForUser: mocks.reconcileMentorAccessForUser,
}))
vi.mock('~/server/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: mocks.rootInsertValues })),
    transaction: mocks.transaction,
  },
}))

await import('~/lib/auth')

describe('anonymous account authorization preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.writtenValues.length = 0
    mocks.tx.query.anonymousUserLink.findFirst.mockResolvedValue({
      linkedUserId: '22222222-2222-4222-8222-222222222222',
    })
    mocks.tx.query.user.findFirst
      .mockResolvedValueOnce({ stripeCustomerId: null, analyticsEnabled: null })
      .mockResolvedValueOnce({ stripeCustomerId: null, analyticsEnabled: true })
  })

  it('never derives or writes the permanent account role during guest linking', async () => {
    await expect(
      mocks.anonymousOptions?.onLinkAccount({
        anonymousUser: {
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'temp-guest@discuno.com',
          },
        },
        newUser: {
          user: {
            id: '22222222-2222-4222-8222-222222222222',
            // An email-derived update used to downgrade an existing admin.
            email: 'existing.account@example.com',
          },
        },
      })
    ).resolves.toBeUndefined()

    expect(mocks.writtenValues.length).toBeGreaterThan(0)
    expect(mocks.writtenValues.every(values => !Object.hasOwn(values, 'role'))).toBe(true)
  })
})

describe('mentor access reconciliation hooks', () => {
  beforeEach(() => {
    mocks.reconcileMentorAccessForUser.mockReset()
    mocks.reconcileMentorAccessForUser.mockResolvedValue({ status: 'ready' })
    mocks.rootInsertValues.mockClear()
  })

  it('repairs mentor access before every new session is persisted', async () => {
    const hook = mocks.authOptions?.databaseHooks?.session?.create?.before
    expect(hook).toBeTypeOf('function')

    await expect(hook?.({ userId: 'mentor-user-id' })).resolves.toBeUndefined()

    expect(mocks.reconcileMentorAccessForUser).toHaveBeenCalledWith('mentor-user-id')
  })

  it('keeps sign-in fail-closed for mentor access when reconciliation fails', async () => {
    const hook = mocks.authOptions?.databaseHooks?.session?.create?.before
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.reconcileMentorAccessForUser.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(hook?.({ userId: 'mentor-user-id' })).resolves.toBeUndefined()

    expect(log).toHaveBeenCalledWith('[Auth mentor access] Session reconciliation failed', {
      errorKind: 'Error',
    })
    log.mockRestore()
  })

  it('uses the same idempotent repair path during new-user onboarding', async () => {
    const hook = mocks.authOptions?.databaseHooks?.user?.create?.after
    expect(hook).toBeTypeOf('function')

    await expect(
      hook?.({ id: 'new-mentor-id', email: 'student@umich.edu', image: null })
    ).resolves.toBeUndefined()

    expect(mocks.reconcileMentorAccessForUser).toHaveBeenCalledWith('new-mentor-id')
    expect(mocks.rootInsertValues).toHaveBeenCalledWith({ createdById: 'new-mentor-id' })
  })
})
