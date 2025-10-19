'use cache'
import 'server-only'

import { cacheLife } from 'next/dist/server/use-cache/cache-life'
import { cache } from 'react'
import { getAllMajors, getAllSchools } from '~/server/dal/schools'

/**
 * Query Layer for reference data (schools, majors)
 * Heavily cached static data
 */

/**
 * Get all schools formatted for dropdowns
 */
export const getSchools = cache(async () => {
  cacheLife('max')
  const schools = await getAllSchools()
  return schools.map(school => ({
    label: school.name,
    value: school.domainPrefix, // Use domain prefix instead of full name
    id: school.id,
    domainPrefix: school.domainPrefix, // Include for lookups
  }))
})

/**
 * Get all majors formatted for dropdowns
 */
export const getMajors = cache(async () => {
  cacheLife('max')
  const majors = await getAllMajors()
  return majors.map(major => ({
    label: major.name,
    value: major.name.toLowerCase(),
    id: major.id,
  }))
})
