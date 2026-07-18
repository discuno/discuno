import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '~/app/types'

const mocks = vi.hoisted(() => ({
  fetchPostsAction: vi.fn(),
  fetchPostsByFilterAction: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}))

vi.mock('~/app/(app)/(public)/(feed)/(post)/actions', () => ({
  fetchPostsAction: mocks.fetchPostsAction,
  fetchPostsByFilterAction: mocks.fetchPostsByFilterAction,
  logAnalyticsEvent: mocks.logAnalyticsEvent,
}))

vi.mock('~/lib/analytics/client-consent', () => ({
  getClientAnalyticsConsentSnapshot: () => 'disabled',
}))

import { PostGrid } from './PostGrid'

const makeCard = (id: number, overrides: Partial<Card> = {}): Card => ({
  id,
  createdById: `00000000-0000-4000-8000-${id.toString().padStart(12, '0')}`,
  random_sort_key: id / 10,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  name: `Mentor ${id}`,
  username: `mentor-${id}`,
  calcomUsername: `calendar-${id}`,
  verifiedSchoolEmail: true,
  description: 'I can share what I learned while making this decision.',
  userImage: null,
  schoolYear: 'Junior',
  school: 'University of Michigan',
  schoolDomainPrefix: 'umich',
  major: 'Computer Science',
  graduationYear: 2027,
  schoolPrimaryColor: null,
  schoolSecondaryColor: null,
  hasFreeSessions: true,
  ...overrides,
})

const renderWithQueryClient = (children: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>)
}

const renderGrid = (
  posts: Card[],
  filters: {
    schoolId?: number | null
    majorId?: number | null
    graduationYear?: number | null
  } = {}
) =>
  renderWithQueryClient(
    <PostGrid
      schoolId={filters.schoolId ?? null}
      majorId={filters.majorId ?? null}
      graduationYear={filters.graduationYear ?? null}
      initialPage={{ posts, hasMore: false }}
    />
  )

describe('public mentor discovery grid', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a single mentor as an actionable list row', () => {
    const { container } = renderGrid([makeCard(1)])

    expect(container.querySelector('[data-mentor-layout]')).toHaveAttribute(
      'data-mentor-layout',
      'list'
    )
    expect(container.querySelector('[data-mentor-layout]')).toHaveAttribute(
      'data-mentor-count',
      '1'
    )
    expect(screen.getByRole('heading', { name: 'Mentor 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "See Mentor 1's sessions" })).toHaveAttribute(
      'href',
      '/mentor/mentor-1'
    )
    expect(mocks.fetchPostsAction).not.toHaveBeenCalled()
  })

  it('keeps multiple mentors in the same flat list', () => {
    const { container } = renderGrid([makeCard(1), makeCard(2)])

    expect(container.querySelector('[data-mentor-layout]')).toHaveAttribute(
      'data-mentor-layout',
      'list'
    )
    expect(container.querySelector('[data-mentor-layout]')).toHaveAttribute(
      'data-mentor-count',
      '2'
    )
  })

  it('sets honest expectations when no profiles are public', () => {
    renderGrid([])

    expect(screen.getByText('Mentor profiles are being prepared')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /read college guides/i })).toHaveAttribute(
      'href',
      '/blog'
    )
  })

  it('offers a useful recovery path when no mentor exactly matches a filter', () => {
    renderGrid([], { schoolId: 11 })

    expect(screen.getByText('No exact matches yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /clear all filters/i })).toHaveAttribute(
      'href',
      '/find#mentors'
    )
  })

  it('preserves the first-party profile-view signal from the mentor call to action', () => {
    const card = makeCard(1)
    renderGrid([card])

    const callToAction = screen.getByRole('link', { name: "See Mentor 1's sessions" })
    callToAction.addEventListener('click', event => event.preventDefault())
    fireEvent.click(callToAction)

    expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith({
      eventType: 'PROFILE_VIEW',
      targetUserId: card.createdById,
      postId: card.id,
    })
  })

  it('uses structured discovery links without carrying the decision question', () => {
    renderGrid([makeCard(1)])

    expect(screen.getByRole('link', { name: 'University of Michigan' })).toHaveAttribute(
      'href',
      '/find?school=umich#mentors'
    )
    expect(screen.getByRole('link', { name: 'Computer Science' })).toHaveAttribute(
      'href',
      '/find?major=computer%20science#mentors'
    )
    expect(
      screen.getByRole('link', { name: "See Mentor 1's sessions" }).getAttribute('href')
    ).not.toContain('question')
  })
})
