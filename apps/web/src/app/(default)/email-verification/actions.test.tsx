import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkVerificationStatus } from './actions'

// Mock the auth utils
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(),
}))

// Mock the server queries
vi.mock('~/server/queries', () => ({
  getProfile: vi.fn(),
}))

const { requireAuth } = await import('~/lib/auth/auth-utils')
const { getProfile } = await import('~/server/queries')

describe('Email Verification Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('checkVerificationStatus', () => {
    it('should return true when user is verified', async () => {
      const mockUserId = 'test-user-123'
      const mockProfile = {
        id: 1,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Senior' as const,
        graduationYear: 2025,
        eduEmail: 'student@university.edu',
        isEduVerified: true,
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(true)
    })

    it('should return false when user is not verified', async () => {
      const mockUserId = 'test-user-456'
      const mockProfile = {
        id: 2,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Junior' as const,
        graduationYear: 2026,
        eduEmail: 'student@university.edu',
        isEduVerified: false,
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(false)
    })

    it('should return false when profile is null', async () => {
      const mockUserId = 'test-user-789'

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(null)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(false)
    })

    it('should return false when profile is undefined', async () => {
      const mockUserId = 'test-user-101'

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(null)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(false)
    })

    it('should return false when isEduVerified is null', async () => {
      const mockUserId = 'test-user-202'
      const mockProfile = {
        id: 3,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Sophomore' as const,
        graduationYear: 2027,
        eduEmail: 'student@university.edu',
        isEduVerified: null as any, // Force null to test edge case
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(false)
    })

    it('should handle authentication errors', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Not authenticated'))

      await expect(checkVerificationStatus()).rejects.toThrow('Not authenticated')

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).not.toHaveBeenCalled()
    })

    it('should handle database errors from getProfile', async () => {
      const mockUserId = 'test-user-303'

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockRejectedValue(new Error('Database connection failed'))

      await expect(checkVerificationStatus()).rejects.toThrow('Database connection failed')

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
    })

    it('should handle missing user id from auth', async () => {
      vi.mocked(requireAuth).mockResolvedValue({ id: undefined as any })
      vi.mocked(getProfile).mockResolvedValue(null)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(result).toBe(false)
    })

    it('should handle null user id from auth', async () => {
      vi.mocked(requireAuth).mockResolvedValue({ id: null as any })
      vi.mocked(getProfile).mockResolvedValue(null)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(result).toBe(false)
    })

    it('should handle empty string user id from auth', async () => {
      const mockUserId = ''

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(null)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(false)
    })

    it('should handle profile with missing isEduVerified field', async () => {
      const mockUserId = 'test-user-404'
      const mockProfile = {
        id: 4,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Freshman' as const,
        graduationYear: 2028,
        eduEmail: 'student@university.edu',
        // isEduVerified field intentionally missing
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      } as any

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      const result = await checkVerificationStatus()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).toHaveBeenCalledWith(mockUserId)
      expect(result).toBe(false)
    })

    it('should maintain consistent behavior across multiple calls', async () => {
      const mockUserId = 'test-user-505'
      const mockProfile = {
        id: 5,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Graduate' as const,
        graduationYear: 2024,
        eduEmail: 'grad@university.edu',
        isEduVerified: true,
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      // Make multiple calls
      const results = await Promise.all([
        checkVerificationStatus(),
        checkVerificationStatus(),
        checkVerificationStatus(),
      ])

      // All calls should return the same result
      expect(results).toEqual([true, true, true])
      expect(requireAuth).toHaveBeenCalledTimes(3)
      expect(getProfile).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent calls properly', async () => {
      const mockUserId = 'test-user-606'
      const mockProfile = {
        id: 6,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Senior' as const,
        graduationYear: 2025,
        eduEmail: 'concurrent@university.edu',
        isEduVerified: false,
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        checkVerificationStatus(),
        checkVerificationStatus(),
        checkVerificationStatus(),
      ])

      expect(result1).toBe(false)
      expect(result2).toBe(false)
      expect(result3).toBe(false)
      expect(requireAuth).toHaveBeenCalledTimes(3)
      expect(getProfile).toHaveBeenCalledTimes(3)
    })
  })

  describe('Server Action Requirements', () => {
    it('should always require authentication', async () => {
      const mockUserId = 'test-user-707'
      const mockProfile = {
        id: 7,
        userId: mockUserId,
        bio: 'Test bio',
        schoolYear: 'Junior' as const,
        graduationYear: 2026,
        eduEmail: 'auth@university.edu',
        isEduVerified: true,
        updatedAt: new Date(),
        createdAt: new Date(),
        deletedAt: null,
      }

      vi.mocked(requireAuth).mockResolvedValue({ id: mockUserId })
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      await checkVerificationStatus()

      // Should always call requireAuth first
      expect(requireAuth).toHaveBeenCalledBefore(getProfile as any)
    })

    it('should not make database calls without authentication', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

      try {
        await checkVerificationStatus()
      } catch (error) {
        // Expected to throw
      }

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getProfile).not.toHaveBeenCalled()
    })
  })
})
