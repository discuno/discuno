import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPostsAction, fetchPostsByFilterAction } from './actions'
import type { Card } from '~/app/types'

// Mock the auth utils
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
}))

// Mock the server queries
vi.mock('~/server/queries', () => ({
  getPosts: vi.fn(),
  getPostsByFilters: vi.fn(),
}))

const { requireAuth } = await import('~/lib/auth/auth-utils')
const { getPosts, getPostsByFilters } = await import('~/server/queries')

const mockPosts: Card[] = [
  {
    id: 1,
    name: 'Test Post 1',
    description: 'Test description 1',
    createdById: 'user1',
    createdAt: new Date(),
    userImage: 'test-image-1.jpg',
    graduationYear: 2025,
    schoolYear: 'Senior',
    school: 'Test University',
    major: 'Computer Science',
  },
  {
    id: 2,
    name: 'Test Post 2',
    description: 'Test description 2',
    createdById: 'user2',
    createdAt: new Date(),
    userImage: 'test-image-2.jpg',
    graduationYear: 2026,
    schoolYear: 'Junior',
    school: 'Another University',
    major: 'Engineering',
  },
]

describe('Dashboard Post Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fetchPostsAction', () => {
    it('should fetch posts with default parameters', async () => {
      vi.mocked(getPosts).mockResolvedValue(mockPosts)

      const result = await fetchPostsAction()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getPosts).toHaveBeenCalledWith(20, 0)
      expect(result).toEqual(mockPosts)
    })

    it('should fetch posts with custom limit and offset', async () => {
      const customLimit = 10
      const customOffset = 5
      vi.mocked(getPosts).mockResolvedValue([mockPosts[0] as Card])

      const result = await fetchPostsAction(customLimit, customOffset)

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getPosts).toHaveBeenCalledWith(customLimit, customOffset)
      expect(result).toEqual([mockPosts[0]])
    })

    it('should handle authentication errors', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

      await expect(fetchPostsAction()).rejects.toThrow('Unauthorized')
      expect(getPosts).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      vi.mocked(getPosts).mockRejectedValue(new Error('Database connection failed'))

      await expect(fetchPostsAction()).rejects.toThrow('Database connection failed')
      expect(requireAuth).toHaveBeenCalledOnce()
    })

    it('should return empty array when no posts found', async () => {
      vi.mocked(getPosts).mockResolvedValue([])

      const result = await fetchPostsAction()

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getPosts).toHaveBeenCalledWith(20, 0)
      expect(result).toEqual([])
    })
  })

  describe('fetchPostsByFilterAction', () => {
    it('should fetch posts with all filters applied', async () => {
      const schoolId = 1
      const majorId = 2
      const graduationYear = 2025
      const limit = 15
      const offset = 10

      const filteredPosts: Card[] = [mockPosts[0] as Card]
      vi.mocked(getPostsByFilters).mockResolvedValue(filteredPosts)

      const result = await fetchPostsByFilterAction(
        schoolId,
        majorId,
        graduationYear,
        limit,
        offset
      )

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getPostsByFilters).toHaveBeenCalledWith(
        schoolId,
        majorId,
        graduationYear,
        limit,
        offset
      )
      expect(result).toEqual(filteredPosts)
    })

    it('should handle null filters', async () => {
      const schoolId = null
      const majorId = null
      const graduationYear = null

      vi.mocked(getPostsByFilters).mockResolvedValue(mockPosts)

      const result = await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getPostsByFilters).toHaveBeenCalledWith(null, null, null, 20, 0)
      expect(result).toEqual(mockPosts)
    })

    it('should use default limit and offset when not provided', async () => {
      const schoolId = 1
      const majorId = null
      const graduationYear = null

      vi.mocked(getPostsByFilters).mockResolvedValue(mockPosts)

      await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(getPostsByFilters).toHaveBeenCalledWith(schoolId, majorId, graduationYear, 20, 0)
    })

    it('should handle mixed null and valid filters', async () => {
      const schoolId = 5
      const majorId = null
      const graduationYear = 2026

      const mixedFilterPosts: Card[] = [mockPosts[1] as Card]
      vi.mocked(getPostsByFilters).mockResolvedValue(mixedFilterPosts)

      const result = await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getPostsByFilters).toHaveBeenCalledWith(schoolId, majorId, graduationYear, 20, 0)
      expect(result).toEqual(mixedFilterPosts)
    })

    it('should handle authentication errors in filter action', async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error('Authentication failed'))

      await expect(fetchPostsByFilterAction(1, 2, 2025)).rejects.toThrow('Authentication failed')

      expect(getPostsByFilters).not.toHaveBeenCalled()
    })

    it('should handle database errors in filter queries', async () => {
      vi.mocked(getPostsByFilters).mockRejectedValue(new Error('Filter query failed'))

      await expect(fetchPostsByFilterAction(1, 2, 2025)).rejects.toThrow('Filter query failed')

      expect(requireAuth).toHaveBeenCalledOnce()
    })

    it('should handle edge case filter values', async () => {
      const schoolId = 0 // Edge case: zero ID
      const majorId = -1 // Edge case: negative ID (might be used as "no filter")
      const graduationYear = 3000 // Edge case: future year

      vi.mocked(getPostsByFilters).mockResolvedValue([])

      const result = await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(getPostsByFilters).toHaveBeenCalledWith(schoolId, majorId, graduationYear, 20, 0)
      expect(result).toEqual([])
    })
  })

  describe('Server Action Requirements', () => {
    it('should always require authentication for fetchPostsAction', async () => {
      vi.mocked(getPosts).mockResolvedValue([])

      await fetchPostsAction()

      expect(requireAuth).toHaveBeenCalledOnce()
    })

    it('should always require authentication for fetchPostsByFilterAction', async () => {
      vi.mocked(getPostsByFilters).mockResolvedValue([])

      await fetchPostsByFilterAction(1, 2, 2025)

      expect(requireAuth).toHaveBeenCalledOnce()
    })

    it('should handle concurrent requests properly', async () => {
      vi.mocked(getPosts).mockResolvedValue(mockPosts)
      vi.mocked(getPostsByFilters).mockResolvedValue(mockPosts)

      const promises = [
        fetchPostsAction(),
        fetchPostsByFilterAction(1, null, null),
        fetchPostsAction(10, 5),
      ]

      const results = await Promise.all(promises)

      expect(requireAuth).toHaveBeenCalledTimes(3)
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })
})
