import { describe, it, expect, vi } from 'vitest'

// Mock server-only to prevent client-side import errors
vi.mock('server-only', () => ({}))

// Mock drizzle-orm/pg-core
vi.mock('drizzle-orm/pg-core', () => ({
  timestamp: vi.fn((name, options) => ({
    name,
    options,
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
  })),
}))

import { timestamps } from './columns.helpers'
import { timestamp } from 'drizzle-orm/pg-core'

describe('Database Column Helpers', () => {
  describe('Timestamps Helper', () => {
    it('should export timestamps object with correct structure', () => {
      expect(timestamps).toBeDefined()
      expect(timestamps).toHaveProperty('updatedAt')
      expect(timestamps).toHaveProperty('createdAt')
      expect(timestamps).toHaveProperty('deletedAt')
    })

    it('should create updatedAt timestamp with timezone', () => {
      expect(timestamp).toHaveBeenCalledWith('updated_at', {
        withTimezone: true,
      })
      expect(timestamps.updatedAt).toBeDefined()
    })

    it('should create createdAt timestamp with default and not null', () => {
      expect(timestamp).toHaveBeenCalledWith('created_at', {
        withTimezone: true,
      })
      expect(timestamps.createdAt).toBeDefined()
      expect(timestamps.createdAt.defaultNow).toHaveBeenCalled()
      expect(timestamps.createdAt.notNull).toHaveBeenCalled()
    })

    it('should create deletedAt timestamp with timezone', () => {
      expect(timestamp).toHaveBeenCalledWith('deleted_at', {
        withTimezone: true,
      })
      expect(timestamps.deletedAt).toBeDefined()
    })

    it('should use consistent timezone options across all timestamps', () => {
      const mockCalls = vi.mocked(timestamp).mock.calls

      // All timestamp calls should include withTimezone: true
      mockCalls.forEach(([name, options]) => {
        expect(options).toEqual({ withTimezone: true })
      })
    })

    it('should have correct column names', () => {
      const mockCalls = vi.mocked(timestamp).mock.calls
      const expectedNames = ['updated_at', 'created_at', 'deleted_at']

      mockCalls.forEach(([name], index) => {
        expect(expectedNames).toContain(name)
      })
    })
  })

  describe('Timestamp Configuration', () => {
    it('should configure createdAt as not nullable with default', () => {
      // createdAt should be the only one with both defaultNow and notNull
      expect(timestamps.createdAt.defaultNow).toHaveBeenCalled()
      expect(timestamps.createdAt.notNull).toHaveBeenCalled()
    })

    it('should leave updatedAt and deletedAt as nullable', () => {
      // updatedAt and deletedAt should not have notNull called
      expect(timestamps.updatedAt.notNull).not.toHaveBeenCalled()
      expect(timestamps.deletedAt.notNull).not.toHaveBeenCalled()
    })

    it('should not set default values for updatedAt and deletedAt', () => {
      // Only createdAt should have defaultNow
      expect(timestamps.updatedAt.defaultNow).not.toHaveBeenCalled()
      expect(timestamps.deletedAt.defaultNow).not.toHaveBeenCalled()
    })
  })
})
