export interface DiscoveryReturnFilters {
  school?: string | null
  major?: string | null
  gradYear?: string | null
}

const DISCOVERY_FILTER_KEYS = ['school', 'major', 'gradYear'] as const
const DISCOVERY_RETURN_BASE = 'https://discuno.invalid'

export function createDiscoveryReturnHref(filters: DiscoveryReturnFilters) {
  const params = new URLSearchParams()

  for (const key of DISCOVERY_FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }

  const query = params.toString()
  return `/find${query ? `?${query}` : ''}#mentors`
}

export function sanitizeDiscoveryReturnHref(candidate: string | undefined) {
  if (!candidate) return createDiscoveryReturnHref({})

  try {
    const parsed = new URL(candidate, DISCOVERY_RETURN_BASE)
    if (parsed.origin !== DISCOVERY_RETURN_BASE || parsed.pathname !== '/find') {
      return createDiscoveryReturnHref({})
    }

    return createDiscoveryReturnHref({
      school: parsed.searchParams.get('school'),
      major: parsed.searchParams.get('major'),
      gradYear: parsed.searchParams.get('gradYear'),
    })
  } catch {
    return createDiscoveryReturnHref({})
  }
}
