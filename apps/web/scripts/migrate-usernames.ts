import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/server/db/schema/index.js'

// Load environment variables
config({ path: '.env.local' })

// Create database connection for migration script
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const client = postgres(connectionString)
const db = drizzle(client, { schema })
const { user } = schema

async function generateUsername(name: string | null, email: string): Promise<string> {
  // Base: sanitize name or use email prefix
  const base = name
    ? name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 25)
    : (email
        .split('@')[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 25) ?? 'user')

  // Try without suffix
  const exists = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.username, base))
    .limit(1)
  if (!exists.length) return base

  // Add random 4-digit suffix
  for (let i = 0; i < 10; i++) {
    const candidate = `${base}-${Math.floor(1000 + Math.random() * 9000)}`
    const collision = await db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.username, candidate))
      .limit(1)
    if (!collision.length) return candidate
  }

  // Fallback: UUID suffix
  return `${base}-${crypto.randomUUID().substring(0, 8)}`
}

async function migrateUsernames() {
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(sql`username IS NULL`)

  console.log(`Found ${users.length} users without usernames...`)

  let migrated = 0
  let skipped = 0

  for (const u of users) {
    // Skip anonymous users (check email domain) or users without email
    if (!u.email || u.email.includes('@discuno.com')) {
      console.log(`Skipping anonymous user: ${u.email ?? u.id}`)
      skipped++
      continue
    }

    const username = await generateUsername(u.name, u.email)
    const displayUsername = u.name ?? username

    await db.update(user).set({ username, displayUsername }).where(eq(user.id, u.id))

    console.log(`✓ ${u.email} → ${username}`)
    migrated++
  }

  console.log(`\nMigration complete!`)
  console.log(`  Migrated: ${migrated}`)
  console.log(`  Skipped: ${skipped}`)
}

migrateUsernames()
  .then(async () => {
    await client.end()
    process.exit(0)
  })
  .catch(async err => {
    console.error('Migration failed:', err)
    await client.end()
    process.exit(1)
  })
