import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '~/app/types'
import { fetchPostsAction, fetchPostsByFilterAction } from './actions'

// Mock the auth utils
vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
}))

// Mock the queries
vi.mock('~/server/queries', () => ({
  getPostsCursor: vi.fn(),
  getPostsByFilters: vi.fn(),
}))

const { requireAuth } = await import('~/lib/auth/auth-utils')
const { getPostsCursor, getPostsByFilters } = await import('~/server/queries')

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

const mockPostsResponse = {
  posts: mockPosts,
  nextCursor: 123,
  hasMore: true,
}

describe('Dashboard Post Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fetchPostsAction', () => {
    it('should fetch posts with default parameters', async () => {
      vi.mocked(getPostsCursor).mockResolvedValue(mockPostsResponse)

      const result = await fetchPostsAction()

      expect(getPostsCursor).toHaveBeenCalledWith(20, undefined)
      expect(result).toEqual(mockPostsResponse)
    })

    it('should fetch posts with custom limit and cursor', async () => {
      const customLimit = 10
      const customCursor = 456
      const customResponse = {
        posts: [mockPosts[0]!],
        nextCursor: 789,
        hasMore: false,
      }
      vi.mocked(getPostsCursor).mockResolvedValue(customResponse)

      const result = await fetchPostsAction(customLimit, customCursor)

      expect(getPostsCursor).toHaveBeenCalledWith(customLimit, customCursor)
      expect(result).toEqual(customResponse)
    })

    it('should handle database errors', async () => {
      vi.mocked(getPostsCursor).mockRejectedValue(new Error('Database connection failed'))

      await expect(fetchPostsAction()).rejects.toThrow('Database connection failed')
    })

    it('should return empty response when no posts found', async () => {
      const emptyResponse = {
        posts: [],
        nextCursor: undefined,
        hasMore: false,
      }
      vi.mocked(getPostsCursor).mockResolvedValue(emptyResponse)

      const result = await fetchPostsAction()

      expect(getPostsCursor).toHaveBeenCalledWith(20, undefined)
      expect(result).toEqual(emptyResponse)
    })
  })

  describe('fetchPostsByFilterAction', () => {
    it('should fetch posts with all filters applied', async () => {
      const schoolId = 1
      const majorId = 2
      const graduationYear = 2025
      const limit = 15
      const cursor = 10

      const filteredResponse = {
        posts: [mockPosts[0]!],
        nextCursor: 99,
        hasMore: true,
      }
      vi.mocked(getPostsByFilters).mockResolvedValue(filteredResponse)

      const result = await fetchPostsByFilterAction(
        schoolId,
        majorId,
        graduationYear,
        limit,
        cursor
      )

      expect(getPostsByFilters).toHaveBeenCalledWith(
        schoolId,
        majorId,
        graduationYear,
        limit,
        cursor
      )
      expect(result).toEqual(filteredResponse)
    })

    it('should handle null filters', async () => {
      const schoolId = null
      const majorId = null
      const graduationYear = null

      vi.mocked(getPostsByFilters).mockResolvedValue(mockPostsResponse)

      const result = await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(getPostsByFilters).toHaveBeenCalledWith(null, null, null, 20, undefined)
      expect(result).toEqual(mockPostsResponse)
    })

    it('should use default limit and cursor when not provided', async () => {
      const schoolId = 1
      const majorId = null
      const graduationYear = null

      vi.mocked(getPostsByFilters).mockResolvedValue(mockPostsResponse)

      await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(getPostsByFilters).toHaveBeenCalledWith(
        schoolId,
        majorId,
        graduationYear,
        20,
        undefined
      )
    })

    it('should handle mixed null and valid filters', async () => {
      const schoolId = 5
      const majorId = null
      const graduationYear = 2026

      const mixedFilterResponse = {
        posts: [mockPosts[1]!],
        nextCursor: 456,
        hasMore: false,
      }
      vi.mocked(getPostsByFilters).mockResolvedValue(mixedFilterResponse)

      const result = await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(getPostsByFilters).toHaveBeenCalledWith(
        schoolId,
        majorId,
        graduationYear,
        20,
        undefined
      )
      expect(result).toEqual(mixedFilterResponse)
    })

    it('should handle database errors in filter queries', async () => {
      vi.mocked(getPostsByFilters).mockRejectedValue(new Error('Filter query failed'))

      await expect(fetchPostsByFilterAction(1, 2, 2025)).rejects.toThrow('Filter query failed')
    })

    it('should handle edge case filter values', async () => {
      const schoolId = 0 // Edge case: zero ID
      const majorId = -1 // Edge case: negative ID (might be used as "no filter")
      const graduationYear = 3000 // Edge case: future year

      const emptyResponse = {
        posts: [],
        nextCursor: undefined,
        hasMore: false,
      }
      vi.mocked(getPostsByFilters).mockResolvedValue(emptyResponse)

      const result = await fetchPostsByFilterAction(schoolId, majorId, graduationYear)

      expect(getPostsByFilters).toHaveBeenCalledWith(
        schoolId,
        majorId,
        graduationYear,
        20,
        undefined
      )
      expect(result).toEqual(emptyResponse)
    })
  })

  describe('Server Action Requirements', () => {
    it('should handle concurrent requests properly', async () => {
      vi.mocked(getPostsCursor).mockResolvedValue(mockPostsResponse)
      vi.mocked(getPostsByFilters).mockResolvedValue(mockPostsResponse)

      const promises = [
        fetchPostsAction(),
        fetchPostsByFilterAction(1, null, null),
        fetchPostsAction(10, 5),
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toHaveProperty('posts')
        expect(result).toHaveProperty('hasMore')
      })
    })
  })
})
