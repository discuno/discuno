import { describe, expect, it } from 'vitest'
import { admin } from './permissions'

describe('Discuno admin permissions', () => {
  it('keeps the supported Better Auth user and session operations explicit', () => {
    expect(admin.statements).toEqual({
      user: [
        'create',
        'list',
        'set-role',
        'ban',
        'impersonate',
        'set-password',
        'set-email',
        'get',
        'update',
      ],
      session: ['list', 'revoke', 'delete'],
      content: ['create', 'read', 'update', 'delete'],
      mentor: ['manage'],
    })
  })

  it('denies Better Auth direct user deletion while retaining session revocation', () => {
    expect(admin.authorize({ user: ['delete'] })).toMatchObject({ success: false })
    expect(admin.authorize({ session: ['revoke', 'delete'] })).toEqual({ success: true })
  })
})
