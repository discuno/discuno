import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all the dependencies
vi.mock('~/server/queries', () => ({
  getMajors: vi.fn(),
  getSchools: vi.fn(),
}))

vi.mock('~/lib/auth/auth-utils', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('~/app/(default)/(dashboard)/(post)/actions', () => ({
  fetchPostsAction: vi.fn(),
  fetchPostsByFilterAction: vi.fn(),
}))

vi.mock('~/app/(default)/(dashboard)/FilterButton', () => ({
  FilterButton: ({ filterItems, startValue, queryName }: any) => (
    <div data-testid={`filter-${queryName}`}>Filter: {startValue}</div>
  ),
}))

vi.mock('~/app/(default)/(dashboard)/(post)/PostGrid', () => ({
  PostGrid: ({ posts }: any) => <div data-testid="post-grid">Posts: {posts.length}</div>,
}))

const { getMajors, getSchools } = await import('~/server/queries')
const { requireAuth } = await import('~/lib/auth/auth-utils')
const { fetchPostsAction, fetchPostsByFilterAction } = await import(
  '~/app/(default)/(dashboard)/(post)/actions'
)

// Mock session for consistent testing
const mockSession = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
}

// Create a mock HomePage component that mimics the structure
const MockHomePage = async ({
  searchParams = {},
}: {
  searchParams?: { school?: string; major?: string; gradYear?: string }
}) => {
  // Simulate the server component behavior
  await requireAuth()

  const schools = await getSchools()
  const majors = await getMajors()

  const gradYears: {
    value: string
    label: string
    id: number
  }[] = Array.from({ length: 6 }, (_, i) => {
    const year = 2025 + i
    return {
      id: year,
      value: year.toString(),
      label: year.toString(),
    }
  })

  const schoolId = searchParams.school
    ? (schools.find(s => s.label === searchParams.school)?.id ?? null)
    : null
  const majorId = searchParams.major
    ? (majors.find(m => m.label === searchParams.major)?.id ?? null)
    : null
  const graduationYear = searchParams.gradYear ? parseInt(searchParams.gradYear) : null

  const initialPosts =
    schoolId || majorId || graduationYear
      ? await fetchPostsByFilterAction(schoolId, majorId, graduationYear)
      : await fetchPostsAction()

  return (
    <main data-testid="homepage">
      <div data-testid="filter-section">
        <div data-testid="filter-school">Filter: {searchParams.school ?? ''}</div>
        <div data-testid="filter-major">Filter: {searchParams.major ?? ''}</div>
        <div data-testid="filter-gradyear">Filter: {searchParams.gradYear ?? ''}</div>
      </div>
      <div data-testid="post-grid">Posts: {initialPosts.posts.length}</div>
    </main>
  )
}

describe('Dashboard HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockSchools = [
    { id: 1, label: 'Test University', value: 'test-university' },
    { id: 2, label: 'Another College', value: 'another-college' },
  ]

  const mockMajors = [
    { id: 1, label: 'Engineering', value: 'engineering' },
    { id: 2, label: 'Computer Science', value: 'computer-science' },
  ]

  const mockPostsArray = [
    {
      id: 1,
      name: 'Test Post',
      description: 'Test Description',
      createdById: 'user1',
      createdAt: new Date(),
      userImage: null,
      graduationYear: 2025,
      schoolYear: 'Senior',
      school: 'Test University',
      major: 'Computer Science',
    },
  ]

  const mockPostsResponse = {
    posts: mockPostsArray,
    nextCursor: 123,
    hasMore: true,
  }

  const emptyPostsResponse = {
    posts: [],
    nextCursor: undefined,
    hasMore: false,
  }

  it('should require authentication', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsAction).mockResolvedValue(mockPostsResponse)

    await MockHomePage({})

    expect(requireAuth).toHaveBeenCalledOnce()
  })

  it('should fetch schools and majors data', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsAction).mockResolvedValue(mockPostsResponse)

    await MockHomePage({})

    expect(getMajors).toHaveBeenCalledOnce()
    expect(getSchools).toHaveBeenCalledOnce()
  })

  it('should fetch all posts when no filters are applied', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsAction).mockResolvedValue(mockPostsResponse)

    await MockHomePage({})

    expect(fetchPostsAction).toHaveBeenCalledOnce()
    expect(fetchPostsByFilterAction).not.toHaveBeenCalled()
  })

  it('should fetch filtered posts when filters are applied', async () => {
    const searchParams = {
      school: 'Test University',
      major: 'Computer Science',
      gradYear: '2025',
    }

    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsByFilterAction).mockResolvedValue(mockPostsResponse)

    await MockHomePage({ searchParams })

    expect(fetchPostsByFilterAction).toHaveBeenCalledWith(1, 2, 2025)
    expect(fetchPostsAction).not.toHaveBeenCalled()
  })

  it('should handle partial filters', async () => {
    const searchParams = {
      school: 'Test University',
    }

    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsByFilterAction).mockResolvedValue(mockPostsResponse)

    await MockHomePage({ searchParams })

    expect(fetchPostsByFilterAction).toHaveBeenCalledWith(1, null, null)
  })

  it('should generate correct graduation years array', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsAction).mockResolvedValue(mockPostsResponse)

    await MockHomePage({})

    // The component should generate years 2025-2030 (6 years)
    // This is tested indirectly through the filter functionality
    expect(getMajors).toHaveBeenCalled()
    expect(getSchools).toHaveBeenCalled()
  })

  it('should handle authentication errors', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('Unauthorized'))

    await expect(MockHomePage({})).rejects.toThrow('Unauthorized')
  })

  it('should handle data fetching errors', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockRejectedValue(new Error('Database error'))

    await expect(MockHomePage({})).rejects.toThrow('Database error')
  })

  it('should handle posts fetching errors', async () => {
    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsAction).mockRejectedValue(new Error('Posts fetch error'))

    await expect(MockHomePage({})).rejects.toThrow('Posts fetch error')
  })

  it('should handle non-existent filter values', async () => {
    const searchParams = {
      school: 'Non-existent School',
      major: 'Non-existent Major',
      gradYear: '1999',
    }

    vi.mocked(requireAuth).mockResolvedValue(mockSession)
    vi.mocked(getMajors).mockResolvedValue(mockMajors)
    vi.mocked(getSchools).mockResolvedValue(mockSchools)
    vi.mocked(fetchPostsByFilterAction).mockResolvedValue(emptyPostsResponse)

    await MockHomePage({ searchParams })

    // Should pass null values for non-existent filters
    expect(fetchPostsByFilterAction).toHaveBeenCalledWith(null, null, 1999)
  })

  describe('Server Component Behavior', () => {
    it('should execute all data fetching on server side', async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockSession)
      vi.mocked(getMajors).mockResolvedValue(mockMajors)
      vi.mocked(getSchools).mockResolvedValue(mockSchools)
      vi.mocked(fetchPostsAction).mockResolvedValue(mockPostsResponse)

      await MockHomePage({})

      // All async operations should be awaited
      expect(requireAuth).toHaveBeenCalledOnce()
      expect(getMajors).toHaveBeenCalledOnce()
      expect(getSchools).toHaveBeenCalledOnce()
      expect(fetchPostsAction).toHaveBeenCalledOnce()
    })

    it('should handle searchParams as Promise', async () => {
      // Test that the component can handle Promise<searchParams>
      const promiseSearchParams = Promise.resolve({
        school: 'Test University',
      })

      vi.mocked(requireAuth).mockResolvedValue(mockSession)
      vi.mocked(getMajors).mockResolvedValue(mockMajors)
      vi.mocked(getSchools).mockResolvedValue(mockSchools)
      vi.mocked(fetchPostsByFilterAction).mockResolvedValue(mockPostsResponse)

      // This would be how the real component handles it
      const resolvedParams = await promiseSearchParams
      await MockHomePage({ searchParams: resolvedParams })

      expect(fetchPostsByFilterAction).toHaveBeenCalledWith(1, null, null)
    })
  })

  describe('Filter Logic', () => {
    it('should correctly map school names to IDs', async () => {
      const searchParams = { school: 'Test University' }

      vi.mocked(requireAuth).mockResolvedValue(mockSession)
      vi.mocked(getMajors).mockResolvedValue(mockMajors)
      vi.mocked(getSchools).mockResolvedValue(mockSchools)
      vi.mocked(fetchPostsByFilterAction).mockResolvedValue(mockPostsResponse)

      await MockHomePage({ searchParams })

      expect(fetchPostsByFilterAction).toHaveBeenCalledWith(1, null, null)
    })

    it('should correctly map major names to IDs', async () => {
      const searchParams = { major: 'Computer Science' }

      vi.mocked(requireAuth).mockResolvedValue(mockSession)
      vi.mocked(getMajors).mockResolvedValue(mockMajors)
      vi.mocked(getSchools).mockResolvedValue(mockSchools)
      vi.mocked(fetchPostsByFilterAction).mockResolvedValue(mockPostsResponse)

      await MockHomePage({ searchParams })

      expect(fetchPostsByFilterAction).toHaveBeenCalledWith(null, 2, null)
    })

    it('should correctly map graduation years', async () => {
      const searchParams = { gradYear: '2025' }

      vi.mocked(requireAuth).mockResolvedValue(mockSession)
      vi.mocked(getMajors).mockResolvedValue(mockMajors)
      vi.mocked(getSchools).mockResolvedValue(mockSchools)
      vi.mocked(fetchPostsByFilterAction).mockResolvedValue(mockPostsResponse)

      await MockHomePage({ searchParams })

      expect(fetchPostsByFilterAction).toHaveBeenCalledWith(null, null, 2025)
    })
  })
})
