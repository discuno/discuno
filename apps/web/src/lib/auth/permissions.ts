import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access'

/**
 * Discuno Access Control System
 *
 * CRITICAL: Permission checks are enforced at the DATA ACCESS LAYER
 * (apps/web/src/server/queries/, apps/web/src/server/dal/)
 *
 * Layouts/actions/services delegate to query functions which enforce permissions.
 * This ensures protection cannot be bypassed.
 *
 * Design Philosophy:
 * - Feature-level domains (not granular resources)
 * - Simple & declarative
 * - Don't over-model permissions for features a single role will always own
 */

/**
 * Application Resources and Actions
 *
 * Simplified to 2 feature-level domains:
 * 1. mentor: All mentor dashboard features (availability, event types, Stripe, bookings, profiles)
 * 2. content: Post creation and management
 */
export const statement = {
  ...defaultStatements, // Includes: user, session (from BetterAuth admin plugin)

  // DOMAIN 1: Mentor Dashboard
  // Consolidates: availability, eventType, stripeAccount, payment, booking management, profile
  // Protects ALL mentor data access in apps/web/src/server/queries/
  mentor: ['manage'],

  // DOMAIN 2: Content Management
  content: ['create', 'read', 'update', 'delete'],
} as const

// Create an access control instance with our statements
export const ac = createAccessControl(statement)

/**
 * User Role
 *
 * Default role for all authenticated users (non-.edu emails)
 * - Can create and read posts
 * - No mentor dashboard access
 */
export const user = ac.newRole({
  ...userAc.statements, // BetterAuth user defaults
  content: ['create', 'read'],
})

/**
 * Mentor Role
 *
 * Role for users with .edu email addresses
 * Includes all user permissions PLUS:
 * - Full mentor dashboard access (profiles, availability, event types, Stripe, bookings, payments)
 * - Can update and delete posts
 */
export const mentor = ac.newRole({
  ...userAc.statements, // BetterAuth user defaults
  content: ['create', 'read', 'update', 'delete'],
  mentor: ['manage'], // ← Full access to all mentor data
})

/**
 * Admin Role
 *
 * Full system access - can impersonate mentors
 * Includes BetterAuth admin capabilities (user management, session control, etc.)
 */
export const admin = ac.newRole({
  ...adminAc.statements, // BetterAuth admin defaults
  content: ['create', 'read', 'update', 'delete'],
  mentor: ['manage'], // ← Can access mentor dashboard (impersonation)
})
