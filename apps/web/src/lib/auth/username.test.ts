import { describe, expect, it } from 'vitest'
import { discunoUsernameSchema, isValidDiscunoUsername, normalizeDiscunoUsername } from './username'

describe('Discuno usernames', () => {
  it('uses the same lowercase URL normalization as Better Auth', () => {
    expect(normalizeDiscunoUsername('Brad.McNew 7')).toBe('brad-mcnew-7')
    expect(discunoUsernameSchema.parse('Brad.McNew 7')).toBe('brad-mcnew-7')
  })

  it('accepts only the normalized public-route alphabet', () => {
    expect(isValidDiscunoUsername('brad_mcnew-7')).toBe(true)
    expect(isValidDiscunoUsername('brad.mcnew')).toBe(false)
  })

  it.each(['', 'ab', '***', 'a'.repeat(31)])('rejects an invalid username: %j', username => {
    expect(discunoUsernameSchema.safeParse(username).success).toBe(false)
  })
})
