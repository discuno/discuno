import { db } from '~/server/db'

let cachedDomains: Set<string> | null = null

export const getAllowedDomains = async (): Promise<Set<string>> => {
  if (cachedDomains) {
    console.log('[auth] Using cached domain prefixes')
    return cachedDomains
  }

  try {
    const allSchools = await db.query.school.findMany()
    console.log(`[auth] Loading ${allSchools.length} schools from database`)

    // Store domain prefixes WITHOUT .edu (e.g., 'stanford', 'umich', 'smccme')
    // Trim whitespace and convert to lowercase for consistency
    cachedDomains = new Set(
      allSchools
        .map(s => s.domainPrefix.trim().toLowerCase())
        .filter((d): d is string => !!d && d.length > 0)
    )
    console.log(`[auth] Loaded ${cachedDomains.size} allowed domain prefixes`)

    // Debug: Log first 10 domains
    const sampleDomains = Array.from(cachedDomains).slice(0, 10)
    console.log(`[auth] Sample domain prefixes:`, sampleDomains)

    // Check for common domains
    const checkDomains = ['umich', 'smccme', 'stanford']
    checkDomains.forEach(domain => {
      if (cachedDomains?.has(domain)) {
        console.log(`[auth] ✅ ${domain} found`)
      }
    })

    return cachedDomains
  } catch (err) {
    console.error('[auth] Failed to load school domains:', err)
    return new Set() // fallback to reject all
  }
}

// Clear the cache (useful after adding schools to database)
export const clearDomainCache = () => {
  console.log('[auth] Clearing domain cache')
  cachedDomains = null
}
