#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'

const curatedPath = path.resolve('scripts/us_schools_unsorted.json')
const allSchoolsPath = path.resolve('scripts/us_schools.json')
const outputPath = path.resolve('scripts/us_schools_sorted.json')

function main() {
  const curatedRaw = fs.readFileSync(curatedPath, 'utf8')
  const allSchoolsRaw = fs.readFileSync(allSchoolsPath, 'utf8')

  let curated, allSchools
  try {
    curated = JSON.parse(curatedRaw)
    allSchools = JSON.parse(allSchoolsRaw)
  } catch (err) {
    console.error('❌ Error parsing JSON files:', err)
    process.exit(1)
  }

  if (!Array.isArray(curated) || !Array.isArray(allSchools)) {
    console.error('❌ Both files must contain JSON arrays.')
    process.exit(1)
  }

  // --- Sort alphabetically by name ---
  const sorted = [...curated].sort((a, b) => a.name.localeCompare(b.name))

  // --- Check for duplicate domainPrefixes ---
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const s of sorted) {
    if (s.domainPrefix) {
      if (seen.has(s.domainPrefix)) duplicates.push(s.domainPrefix)
      seen.add(s.domainPrefix)
    }
  }

  if (duplicates.length > 0) {
    console.warn(`⚠️ Found ${duplicates.length} duplicate domainPrefixes:`)
    duplicates.forEach(d => console.warn('  •', d))
  } else {
    console.log('✅ No duplicate domainPrefixes found.')
  }

  // --- Check for missing domainPrefixes in master list ---
  const allPrefixes = new Set(allSchools.map(s => s.domainPrefix))
  const missing: string[] = []

  for (const s of sorted) {
    if (!allPrefixes.has(s.domainPrefix)) missing.push(s.domainPrefix)
  }

  if (missing.length > 0) {
    console.warn(`⚠️ Missing ${missing.length} domainPrefixes in full dataset:`)
    missing.forEach(d => console.warn('  •', d))
  } else {
    console.log('✅ All domainPrefixes exist in master dataset.')
  }

  // --- Write sorted output file ---
  fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
  console.log(`💾 Sorted file written to: ${outputPath}`)
}

main()
