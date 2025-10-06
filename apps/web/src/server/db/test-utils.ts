import { getTableName, isTable, sql } from 'drizzle-orm'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'

/**
 * Clears all data from the database.
 *
 * NOTE: This is a destructive operation and should only be used in tests.
 */
export async function clearDatabase() {
  const tableNames = Object.values(schema)
    .filter(isTable)
    // @ts-expect-error - ignore non-table exports
    .map(table => getTableName(table))
    .filter(Boolean)

  if (tableNames.length === 0) {
    return
  }

  // Validate all table names to prevent SQL injection
  const validTableNames = tableNames.filter(name => {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      console.warn(`⚠️  Skipping invalid table name: ${name}`)
      return false
    }
    return true
  })

  if (validTableNames.length === 0) {
    return
  }

  const joinedTableNames = validTableNames.map(name => `"${name}"`).join(', ')

  await testDb.execute(sql.raw(`TRUNCATE TABLE ${joinedTableNames} RESTART IDENTITY CASCADE`))
}
