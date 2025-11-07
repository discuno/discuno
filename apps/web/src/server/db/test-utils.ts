import { getTableName, sql } from 'drizzle-orm'
import { tables } from '~/server/db/schema/index'
import { testDb } from '~/server/db/test-db'

/**
 * Clears all data from the database.
 *
 * NOTE: This is a destructive operation and should only be used in tests.
 */
export async function clearDatabase() {
  const tableNames = tables.map(table => getTableName(table)).filter(Boolean)

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
