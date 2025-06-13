import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only to prevent client-side import errors
vi.mock('server-only', () => ({}))

// Mock the database
import { mockDb } from './__tests__/test-db'

vi.mock('~/server/db', () => ({
  db: mockDb,
}))

import { getSchools, getMajors } from './queries'

// Mock the auth requirement
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  }),
}))

describe('Server Queries', () => {
  beforeEach(() => {
    mockDb.reset()
    vi.clearAllMocks()
  })

  describe('getSchools', () => {
    it('should return formatted schools list', async () => {
      // Setup test data
      mockDb.addSchool({ id: 1, name: 'Harvard University' })
      mockDb.addSchool({ id: 2, name: 'MIT' })
      mockDb.addSchool({ id: 3, name: 'Stanford University' })

      const result = await getSchools()

      expect(result).toHaveLength(3)
      expect(result).toEqual([
        { id: 1, label: 'Harvard University', value: 'harvard university' },
        { id: 2, label: 'MIT', value: 'mit' },
        { id: 3, label: 'Stanford University', value: 'stanford university' },
      ])
    })

    it('should handle schools with null names', async () => {
      mockDb.addSchool({ id: 1, name: null as any })
      mockDb.addSchool({ id: 2, name: 'Valid School' })

      const result = await getSchools()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 1, label: 'Unknown', value: 'unknown' })
      expect(result[1]).toEqual({
        id: 2,
        label: 'Valid School',
        value: 'valid school',
      })
    })

    it('should return empty array when no schools exist', async () => {
      const result = await getSchools()

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockDb.query.schools.findMany.mockRejectedValue(new Error('Database error'))

      await expect(getSchools()).rejects.toThrow('Failed to get schools')
    })
  })

  describe('getMajors', () => {
    it('should return formatted majors list', async () => {
      // Setup test data
      mockDb.addMajor({ id: 1, name: 'Computer Science' })
      mockDb.addMajor({ id: 2, name: 'Business Administration' })
      mockDb.addMajor({ id: 3, name: 'Electrical Engineering' })

      const result = await getMajors()

      expect(result).toHaveLength(3)
      expect(result).toEqual([
        { id: 1, label: 'Computer Science', value: 'computer science' },
        {
          id: 2,
          label: 'Business Administration',
          value: 'business administration',
        },
        {
          id: 3,
          label: 'Electrical Engineering',
          value: 'electrical engineering',
        },
      ])
    })

    it('should handle majors with null names', async () => {
      mockDb.addMajor({ id: 1, name: null as any })
      mockDb.addMajor({ id: 2, name: 'Valid Major' })

      const result = await getMajors()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 1, label: 'Unknown', value: 'unknown' })
      expect(result[1]).toEqual({
        id: 2,
        label: 'Valid Major',
        value: 'valid major',
      })
    })

    it('should return empty array when no majors exist', async () => {
      const result = await getMajors()

      expect(result).toEqual([])
    })

    it('should throw error when database query fails', async () => {
      mockDb.query.majors.findMany.mockRejectedValue(new Error('Database error'))

      await expect(getMajors()).rejects.toThrow('Failed to get majors')
    })
  })

  describe('Authentication Requirements', () => {
    it('should require authentication for getSchools', async () => {
      const { requireAuth } = await import('~/lib/auth/auth-utils')
      const mockRequireAuth = vi.mocked(requireAuth)

      mockRequireAuth.mockRejectedValue(new Error('Authentication required'))

      await expect(getSchools()).rejects.toThrow('Authentication required')
    })

    it('should require authentication for getMajors', async () => {
      const { requireAuth } = await import('~/lib/auth/auth-utils')
      const mockRequireAuth = vi.mocked(requireAuth)

      mockRequireAuth.mockRejectedValue(new Error('Authentication required'))

      await expect(getMajors()).rejects.toThrow('Authentication required')
    })
  })

  // Additional tests will be added in future iterations to maintain smaller, focused changes
})
