import { describe, expect, it, vi } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock drizzle-orm modules to prevent import issues
vi.mock('drizzle-orm/pg-core', () => ({
  pgTable: vi.fn(() => ({})),
  pgTableCreator: vi.fn(() => vi.fn(() => ({}))),
  text: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
  })),
  varchar: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
    primaryKey: vi.fn().mockReturnThis(),
    $defaultFn: vi.fn().mockReturnThis(),
    unique: vi.fn().mockReturnThis(),
    references: vi.fn().mockReturnThis(),
    $type: vi.fn().mockReturnThis(),
    default: vi.fn().mockReturnThis(),
  })),
  timestamp: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    default: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
  })),
  boolean: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
    default: vi.fn().mockReturnThis(),
  })),
  uuid: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
  })),
  integer: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
    primaryKey: vi.fn().mockReturnThis(),
    generatedByDefaultAsIdentity: vi.fn().mockReturnThis(),
    references: vi.fn().mockReturnThis(),
  })),
  serial: vi.fn(() => ({
    defaultNow: vi.fn().mockReturnThis(),
    notNull: vi.fn().mockReturnThis(),
  })),
  primaryKey: vi.fn(() => ({})),
  unique: vi.fn(() => ({})),
  pgEnum: vi.fn(() =>
    vi.fn(() => ({
      notNull: vi.fn().mockReturnThis(),
    }))
  ),
  jsonb: vi.fn(() => ({
    default: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('drizzle-orm', () => ({
  relations: vi.fn(() => ({})),
  many: vi.fn(() => ({})),
  one: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}))

// Import after mocks
import * as schema from './schema'

describe('Database Schema', () => {
  describe('Core Tables', () => {
    it('exports users table', () => {
      expect(schema.users).toBeDefined()
    })

    it('exports posts table', () => {
      expect(schema.posts).toBeDefined()
    })

    it('exports userProfiles table', () => {
      expect(schema.userProfiles).toBeDefined()
    })

    it('exports schools table', () => {
      expect(schema.schools).toBeDefined()
    })

    it('exports majors table', () => {
      expect(schema.majors).toBeDefined()
    })
  })

  describe('Authentication Tables', () => {
    it('exports accounts table for NextAuth', () => {
      expect(schema.accounts).toBeDefined()
    })

    it('exports sessions table for NextAuth', () => {
      expect(schema.sessions).toBeDefined()
    })

    it('exports verificationTokens table for NextAuth', () => {
      expect(schema.verificationTokens).toBeDefined()
    })
  })

  describe('Relations', () => {
    it('exports user relations', () => {
      expect(schema.usersRelations).toBeDefined()
    })

    it('exports posts relations', () => {
      expect(schema.postsRelations).toBeDefined()
    })

    it('exports userProfiles relations', () => {
      expect(schema.userProfilesRelations).toBeDefined()
    })

    it('exports accounts relations', () => {
      expect(schema.accountsRelations).toBeDefined()
    })

    it('exports sessions relations', () => {
      expect(schema.sessionsRelations).toBeDefined()
    })

    it('exports mentorStripeAccounts relations', () => {
      expect(schema.mentorStripeAccountsRelations).toBeDefined()
    })

    it('exports mentorEventTypes relations', () => {
      expect(schema.mentorEventTypesRelations).toBeDefined()
    })
  })

  describe('Additional Tables', () => {
    it('exports userMajors junction table', () => {
      expect(schema.userMajors).toBeDefined()
    })

    it('exports userSchools junction table', () => {
      expect(schema.userSchools).toBeDefined()
    })

    it('exports mentorReviews table', () => {
      expect(schema.mentorReviews).toBeDefined()
    })

    it('exports calcomTokens table', () => {
      expect(schema.calcomTokens).toBeDefined()
    })

    it('exports waitlist table', () => {
      expect(schema.waitlist).toBeDefined()
    })

    it('exports mentorStripeAccounts table', () => {
      expect(schema.mentorStripeAccounts).toBeDefined()
    })

    it('exports mentorEventTypes table', () => {
      expect(schema.mentorEventTypes).toBeDefined()
    })
  })

  describe('Schema Structure Validation', () => {
    it('has all core business tables', () => {
      const coreTables = ['users', 'posts', 'userProfiles', 'schools', 'majors']
      coreTables.forEach(table => {
        expect(schema[table as keyof typeof schema]).toBeDefined()
      })
    })

    it('has complete authentication setup', () => {
      const authTables = ['accounts', 'sessions', 'verificationTokens']
      authTables.forEach(table => {
        expect(schema[table as keyof typeof schema]).toBeDefined()
      })
    })

    it('has relational definitions for main tables', () => {
      const relations = [
        'usersRelations',
        'postsRelations',
        'userProfilesRelations',
        'accountsRelations',
        'sessionsRelations',
      ]
      relations.forEach(relation => {
        expect(schema[relation as keyof typeof schema]).toBeDefined()
      })
    })

    it('has junction tables for many-to-many relationships', () => {
      expect(schema.userMajors).toBeDefined()
      expect(schema.userSchools).toBeDefined()
    })

    it('has feature-specific tables', () => {
      expect(schema.mentorReviews).toBeDefined()
      expect(schema.calcomTokens).toBeDefined()
      expect(schema.waitlist).toBeDefined()
      expect(schema.mentorStripeAccounts).toBeDefined()
      expect(schema.mentorEventTypes).toBeDefined()
    })
  })

  describe('Export Count Validation', () => {
    it('exports reasonable number of schema components', () => {
      const exportCount = Object.keys(schema).length

      // Should have core tables + relations + junction tables + feature tables
      expect(exportCount).toBeGreaterThan(10)
      expect(exportCount).toBeLessThan(30)
    })

    it('has consistent export naming', () => {
      const exports = Object.keys(schema)

      // Relations should end with 'Relations'
      const relationExports = exports.filter(name => name.endsWith('Relations'))
      expect(relationExports.length).toBeGreaterThan(3)
    })
  })
})
