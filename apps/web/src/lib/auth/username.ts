import { z } from 'zod/v4'

export const DISCUNO_USERNAME_MIN_LENGTH = 3
export const DISCUNO_USERNAME_MAX_LENGTH = 30

export const normalizeDiscunoUsername = (username: string): string =>
  username.toLowerCase().replace(/[^a-z0-9_-]/g, '-')

export const isValidDiscunoUsername = (username: string): boolean => /^[a-z0-9_-]+$/.test(username)

export const discunoUsernameSchema = z
  .string()
  .trim()
  .min(DISCUNO_USERNAME_MIN_LENGTH, 'Username must be at least 3 characters.')
  .max(DISCUNO_USERNAME_MAX_LENGTH, 'Username must be at most 30 characters.')
  .transform(normalizeDiscunoUsername)
  .refine(isValidDiscunoUsername, 'Username contains unsupported characters.')
  .refine(username => /[a-z0-9]/.test(username), 'Username must include a letter or number.')
