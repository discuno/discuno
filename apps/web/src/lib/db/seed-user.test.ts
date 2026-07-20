import { describe, expect, it } from 'vitest'
import { createSeedMentorUser } from './seed-user'

describe('createSeedMentorUser', () => {
  it('creates a stable public mentor identity', () => {
    expect(
      createSeedMentorUser({
        firstName: 'Amelia',
        lastName: 'Harris',
        index: 24,
        image: 'https://example.com/amelia.jpg',
      })
    ).toEqual({
      name: 'Amelia Harris',
      email: 'amelia.harris25@university.edu',
      username: 'amelia-harris-25',
      displayUsername: 'amelia-harris-25',
      emailVerified: true,
      role: 'mentor',
      image: 'https://example.com/amelia.jpg',
    })
  })

  it('normalizes and bounds usernames using the auth plugin conventions', () => {
    const user = createSeedMentorUser({
      firstName: ' Éléonore ',
      lastName: 'Very Long Family Name With Spaces',
      index: 49,
      image: 'https://example.com/profile.jpg',
    })

    expect(user.username).toMatch(/^[a-z0-9_-]+$/)
    expect(user.username).toHaveLength(30)
    expect(user.username).toBe('eleonore-very-long-family-n-50')
    expect(user.displayUsername).toBe(user.username)
  })

  it('keeps repeated names unique by stable sequence', () => {
    const users = Array.from({ length: 50 }, (_, index) =>
      createSeedMentorUser({
        firstName: 'Alex',
        lastName: 'Smith',
        index,
        image: 'https://example.com/profile.jpg',
      })
    )

    expect(new Set(users.map(user => user.username))).toHaveLength(50)
    expect(new Set(users.map(user => user.email))).toHaveLength(50)
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER])('rejects invalid index %s', index => {
    expect(() =>
      createSeedMentorUser({
        firstName: 'Alex',
        lastName: 'Smith',
        index,
        image: 'https://example.com/profile.jpg',
      })
    ).toThrow('Seed mentor index must be a non-negative safe integer')
  })
})
