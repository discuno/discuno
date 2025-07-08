import { db } from '~/server/db'

let cachedDomains: Set<string> | null = null

export const getAllowedDomains = async (): Promise<Set<string>> => {
  if (cachedDomains) return cachedDomains

  try {
    const allSchools = await db.query.schools.findMany()
    cachedDomains = new Set(
      allSchools.map(s => s.domain?.toLowerCase()).filter((d): d is string => !!d)
    )
    console.log(`[auth] Loaded ${cachedDomains.size} allowed domains`)
    return cachedDomains
  } catch (err) {
    console.error('[auth] Failed to load school domains:', err)
    return new Set() // fallback to reject all
  }
}
