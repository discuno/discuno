# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cross-Agent Coordination

This repository is maintained by multiple AI agents (Gemini, Claude, etc.). When you make a change that renders this file outdated, you are responsible for updating `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to reflect the new project state.

## Project Overview

Discuno is a modern scheduling and mentorship platform built as a monorepo using pnpm workspaces and Turborepo. The platform connects mentors and mentees with integrated calendar management via Cal.com, payment processing through Stripe, and user analytics via PostHog.

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start all development servers
pnpm dev

# Start only the web app
pnpm dev:web

# Build all packages
pnpm build

# Build only the web app
pnpm build:web

# Preview production build
pnpm preview
```

### Vercel CLI

This project uses the Vercel CLI for deployment and environment management:

```bash
# Run local development with Vercel environment variables
vercel dev

# Pull environment variables from Vercel
vercel env pull

# View and manage environment variables
vercel env ls
vercel env add
vercel env rm

# View deployment logs
vercel logs [deployment-url]

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Link local project to Vercel project
vercel link
```

### Quality Checks

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm --filter @discuno/web test:coverage

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:check
```

### Database Operations

```bash
# Generate Drizzle schema from database
pnpm db:generate

# Generate for specific environments
pnpm db:generate:local
pnpm db:generate:preview
pnpm db:generate:prod

# Push schema changes to database
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Open Drizzle Studio for specific environments
pnpm db:studio:local
pnpm db:studio:preview
pnpm db:studio:prod
pnpm db:studio:test

# Seed database with test data
pnpm db:seed

# Reset database (DESTRUCTIVE)
pnpm db:reset:local
pnpm db:reset:preview

# Test database connections
pnpm db:test:local
pnpm db:test:preview
pnpm db:test:prod
```

### Testing Individual Files

```bash
# Run a specific test file
pnpm --filter @discuno/web vitest run src/path/to/file.test.ts

# Run tests in watch mode for a specific file
pnpm --filter @discuno/web vitest watch src/path/to/file.test.ts
```

## Architecture

### Monorepo Structure

- **pnpm workspaces** for package management
- **Turborepo** for build orchestration and caching
- Single application: `apps/web` (Next.js 15)
- **Centralized configuration at root level**: Drizzle configs (`drizzle.*.config.ts`), TypeScript, ESLint, Prettier
- Database scripts in `apps/web/scripts/` reference root-level Drizzle configurations with `../../` paths

### Web Application (`apps/web`)

#### Directory Structure

```
apps/web/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (app)/         # Main authenticated routes
│   │   ├── (auth)/        # Authentication routes
│   │   ├── api/           # API routes & webhooks
│   │   │   ├── auth/      # better-auth catch-all handler
│   │   │   ├── avatar/    # Blob uploads backed by Vercel storage
│   │   │   ├── webhooks/  # Cal.com (`cal/`), Stripe, Stripe Connect
│   │   │   └── cron/      # Scheduled tasks
│   │   └── types/         # Route-specific types
│   ├── components/
│   │   ├── ui/            # Base Radix UI primitives
│   │   └── shared/        # Shared business components
│   ├── server/            # Server-side code
│   │   ├── __tests__/     # Test setup & global configuration
│   │   ├── auth/          # Auth data-access helpers (Cal.com sync, domain cache)
│   │   ├── dal/           # Data access layer modules per domain
│   │   ├── db/            # Drizzle ORM schema & column helpers
│   │   ├── queries/       # Query utilities grouped by feature
│   │   └── ranking/       # User ranking algorithms
│   ├── lib/               # Client/shared utilities
│   │   ├── calcom/        # Cal.com API integration
│   │   ├── stripe/        # Stripe API integration
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── emails/        # Email templates (React Email)
│   │   └── providers/     # React context providers
│   ├── hooks/             # Custom React hooks
│   └── styles/            # Global styles
├── drizzle/               # Database migrations
├── scripts/               # Database scripts & utilities (reference root configs)
└── public/                # Static assets
```

#### Key Technologies

- **Framework**: Next.js 15 with App Router
- **React**: v19 with Server Components
- **Database**: PostgreSQL (Railway) with Drizzle ORM
- **Authentication**: better-auth with Drizzle adapter
- **Styling**: Tailwind CSS 4 + Radix UI primitives
- **Testing**: Vitest + Testing Library + jsdom
- **Type Safety**: TypeScript strict mode + Zod validation
- **Package Manager**: pnpm

### Database Architecture

#### Schema Organization (`apps/web/src/server/db/schema/`)

Schemas are organized by domain modules (`user.ts`, `mentor.ts`, `booking.ts`, `payment.ts`, `post.ts`, `analytics.ts`, `reference.ts`) and re-exported through `index.ts` (which also exposes `allTables`/`tables`). Everything uses Drizzle ORM with snake*case naming conventions and the `discuno*\*` table prefix.

**Core Tables**:

- `discuno_user`, `discuno_account`, `discuno_user_session`, `discuno_verification` - better-auth core tables
- `discuno_user_profile`, `discuno_user_major`, `discuno_user_school` - User metadata with soft deletes
- `discuno_major`, `discuno_school` - Reference data
- `discuno_post`, `discuno_mentor_review` - User-generated content
- `discuno_analytics_event` - User activity tracking for ranking algorithm

**Cal.com Integration**:

- `discuno_calcom_token` - OAuth tokens for Cal.com API
- `discuno_mentor_event_type` - Mentor availability & pricing snapshots
- `discuno_booking` - Booking snapshots from Cal.com webhooks
- `discuno_booking_attendee`, `discuno_booking_organizer` - Normalized booking participants

**Stripe Integration**:

- `discuno_mentor_stripe_account` - Connected account information
- `discuno_payment` - Payment tracking with platform fee calculation and transfer state

**Important Patterns**:

- Soft deletes via `softDeleteTimestamps` helper (`deleted_at`, `created_at`, `updated_at`)
- Compound indexes for common query patterns
- Foreign keys with appropriate cascade/set null behavior
- JSON columns for flexible metadata storage

#### Database Queries

All database queries live in `apps/web/src/server/queries/` (one module per domain) with complementary data access helpers in `apps/web/src/server/dal/`. Prefer these exported functions over ad-hoc SQL so business logic stays consistent.

### Authentication Architecture

better-auth is configured in `apps/web/src/lib/auth.ts` with helpers in `apps/web/src/lib/auth-client.ts` and `apps/web/src/lib/auth/auth-utils.ts`:

- **Providers**: Google, Microsoft Entra ID (OAuth), and email OTP
- **Adapter**: Drizzle adapter backed by PostgreSQL tables
- Server components should call `requireAuth`/`getAuthSession` (wraps `auth.api.getSession`) for typed access
- Client components import `signIn`, `signOut`, and `useSession` from `authClient`
- Database hooks provision Cal.com integration, seed default posts, and assign school metadata on first login

### Access Control (ACL) System

Discuno implements a comprehensive permission-based access control system using BetterAuth's ACL framework. **Always use permission checks instead of role-based checks.**

#### Permission Model (`apps/web/src/lib/auth/permissions.ts`)

**Resources & Actions:**

- `availability`: read, update - Mentor schedule management
- `eventType`: read, update - Event type configuration
- `booking`: read, create, cancel - Booking management
- `stripeAccount`: create, read, update - Payment account management
- `payment`: read - Payment history
- `profile`: read, update, delete - User profile management
- `post`: create, read, update, delete - Content management
- `analytics`: track, read - Analytics events

**Roles:**

- `user`: Basic authenticated user (.edu and non-.edu emails)
  - Can manage own profile, create posts, book sessions, track analytics
- `mentor`: Users with .edu email addresses (inherits user permissions)
  - Additional: manage availability, event types, bookings, Stripe account, view payments
- `admin`: Full system access (all permissions for all resources)

#### Permission-Based Auth Functions

**Server-Side (Server Components, Actions, API Routes):**

```typescript
// Require specific permissions (throws if missing)
import { requirePermission } from '~/lib/auth/auth-utils'

await requirePermission({ availability: ['read'] })
await requirePermission({ availability: ['read', 'update'] })
await requirePermission({
  availability: ['read'],
  eventType: ['update'],
})

// Check permissions without throwing
import { hasPermission } from '~/lib/auth/auth-utils'

const canManage = await hasPermission({ availability: ['update'] })
if (canManage) {
  // Show management UI
}
```

**Client-Side (React Components):**

```typescript
import { authClient } from '~/lib/auth-client'

// Check permissions
const { data: canManage } = await authClient.admin.hasPermission({
  permissions: { availability: ['update'] },
})

// Check role permissions (synchronous, no server call)
const canCreate = authClient.admin.checkRolePermission({
  permissions: { post: ['create'] },
  role: 'user',
})
```

#### Permission Check Patterns

**Layout-Level Protection:**

```typescript
// apps/web/src/app/(app)/(mentor)/settings/layout.tsx
await requirePermission({ availability: ['read'] })
```

**Server Action Protection:**

```typescript
export const updateSchedule = async (schedule: Availability) => {
  await requirePermission({ availability: ['update'] })
  // ... implementation
}
```

**Service Layer Protection:**

```typescript
export const updateMentorEventType = async (id: number, data: UpdateData) => {
  await requirePermission({ eventType: ['update'] })
  return updateEventTypeDal(id, data)
}
```

**Query Layer Protection:**

```typescript
export const getMentorEventTypes = cache(async () => {
  const { user } = await requirePermission({ eventType: ['read'] })
  return getEventTypesByUserId(user.id)
})
```

#### Role Assignment

Roles are automatically assigned during user creation (`apps/web/src/lib/auth.ts`):

- `.edu` email → `mentor` role
- Other emails → `user` role
- Anonymous users → no role (skipped)

Uses `auth.api.setRole()` via BetterAuth admin API with DB fallback.

#### Data Access Layer Protection Pattern

**CRITICAL**: Permission checks are enforced at the DATA ACCESS LAYER (`apps/web/src/server/queries/`), NOT in layouts/actions/services.

**Security Architecture:**

- Query layer = security boundary (all mentor data queries check permissions)
- Layouts = optional UX (early redirect for better experience)
- Actions/Services = delegate to queries (no permission checks)

**Example:**

```typescript
// apps/web/src/server/queries/calcom.ts
export const getMentorCalcomTokens = cache(async () => {
  await requirePermission({ availability: ['read'] }) // ← SECURITY HERE
  const { user } = await requireAuth()
  return getTokensByUserId(user.id)
})

// apps/web/src/app/(app)/(mentor)/settings/actions.ts
export async function getSchedule() {
  // No permission check - protected by getMentorCalcomTokens()
  const tokens = await getMentorCalcomTokens() // ← Protected by query
}
```

The system is now production-ready with proper data-layer security.

### API Integration Patterns

#### Cal.com Integration (`apps/web/src/lib/calcom/`)

- OAuth 2.0 flow for managed users in Cal.com organization
- Token refresh logic with expiration handling
- Webhook handlers in `apps/web/src/app/api/webhooks/cal/`
- All booking state stored locally with Cal.com IDs as foreign keys

#### Stripe Integration (`apps/web/src/lib/stripe/`)

- Stripe Connect for mentor payouts
- Checkout Session flow for bookings
- Webhook handlers in `apps/web/src/app/api/webhooks/stripe/`
- Payment lifecycle: pending → processing → succeeded → transferred
- Dispute period enforced before automatic transfers

#### PostHog Analytics

- Client-side tracking via `posthog-js` (`PostHogProvider`)
- Analytics events stored in the database to support ranking calculations

### Environment Variables

Environment variables are validated using `@t3-oss/env-nextjs` in `apps/web/src/env.js`. The validation runs at build time and provides type-safe access to environment variables.

**Required Variables**:

- Auth & email: `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_SERVER`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `RESEND_API_KEY`
- Platform URLs: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_CALCOM_API_URL`
- Database: `DATABASE_URL` (Railway PostgreSQL connection string)
- Cal.com: `CALCOM_ORG_ID`, `CALCOM_ORG_SLUG`, `CALCOM_COLLEGE_MENTORS_TEAM_SLUG`, `CALCOM_WEBHOOK_SECRET`, `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Misc: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `COLLEGE_MENTOR_TEAM_ID`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN`

Use `SKIP_ENV_VALIDATION=1` to bypass validation during development.

### Testing Conventions

- Tests are colocated with source files using `.test.ts` or `.spec.ts` extensions
- Test configuration in `apps/web/vitest.config.ts` with path alias resolution
- **Global setup** in `apps/web/src/server/__tests__/global-setup.ts` - runs once before all tests to reset database (prevents race conditions)
- **Per-file setup** in `apps/web/src/server/__tests__/setup.ts` - runs for each test file (mocks, cleanup)
- Tests run sequentially (`singleThread: true`) to prevent database conflicts
- Use `.env.test` for test environment variables
- Test database operations use separate test database URLs
- Coverage thresholds: 80% statements, 70% branches, 80% functions/lines
- Test files excluded from main TypeScript build via `tsconfig.json` exclude patterns

### Code Style & Conventions

#### TypeScript

- Strict mode enabled
- Avoid `any` - use specific types or `unknown`
- Export types alongside implementations
- Use path aliases: `~/` maps to `apps/web/src/`

#### React Patterns

- Prefer Server Components by default
- Use `'use client'` directive only when needed
- Functional components with hooks only
- Use composition over inheritance

#### File Naming

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: kebab-case (e.g., `format-date.ts`)
- API routes: kebab-case (e.g., `route.ts`)

#### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Build/config changes

### Important Development Notes

#### Cache Components

- Next.js Cache Components are enabled (`cacheComponents: true` in `apps/web/next.config.js`)
- Apply the `'use cache'` directive explicitly where caching is desired; dynamic logic runs per request otherwise

#### Mentor Dashboard Requirements

Reference `.cursor/rules/mentor-dashboard.md` for mentor dashboard specifications including:

- Meeting management (upcoming, past, cancelled)
- Payment tracking (pending, payouts)
- Stripe account status
- Analytics and notifications

#### Database Migrations

- **Drizzle configs live at root level**: `drizzle.config.ts`, `drizzle.local.config.ts`, `drizzle.preview.config.ts`, `drizzle.production.config.ts`, `drizzle.test.config.ts`
- Database scripts in `apps/web/scripts/` reference root configs with relative paths (`../../drizzle.*.config.ts`)
- Never edit generated migration files in `drizzle/`
- Always modify the appropriate file under `apps/web/src/server/db/schema/` (and update `index.ts`) before regenerating
- Use `pnpm db:generate` to create new migrations (references root-level config)
- Test migrations in local environment before deploying
- Drizzle uses snake_case for column names (configured in root-level drizzle configs)

#### Webhook Development

- Cal.com webhooks: Verify signature using `CALCOM_WEBHOOK_SECRET`
- Stripe webhooks: Verify using `stripe.webhooks.constructEvent()`
- Always store raw webhook payload in database for auditing
- Use idempotency keys to prevent duplicate processing

#### Rate Limiting

Rate limiting is implemented using Upstash Redis in `apps/web/src/lib/rate-limiter.ts`. Apply rate limiting to public API endpoints to prevent abuse.

#### Payment Processing

- Platform fee calculations in payment creation logic
- Dispute period: 7 days after booking completion
- Automatic transfers via cron job after dispute period
- Refund handling for cancelled bookings

### Useful Scripts

Database utility scripts are in `apps/web/scripts/`:

- `db-seed.ts` - Seed database with schools and majors data
- `db-reset.ts` - Reset database (with safety checks)
- `db-push.ts` - Push schema changes to database
- `db-test-connection.ts` - Test database connectivity
- `dev-setup.sh` - Initial development environment setup

### CI/CD

GitHub Actions workflows in `.github/workflows/`:

- **CI**: Runs on all PRs (lint, typecheck, test, build)
- Husky pre-commit hooks run lint-staged
- Commitlint validates commit messages

### Deployment

The application is optimized for Vercel deployment:

- **Vercel CLI** used for local development and manual deployments
- Environment variables managed via Vercel dashboard or `vercel env` commands
- Automatic deployments from `main` branch
- Preview deployments for all PRs
- Railway database branching for preview environments
- Use `vercel --prod` for manual production deployments (when needed)

### Known Patterns

#### BetterAuth Tables

**IMPORTANT**: Never directly manipulate BetterAuth core tables (`user`, `session`, `account`, `verification`) using Drizzle ORM. Always use BetterAuth's API methods:

- **Set user role**: Use `auth.api.setRole({ body: { userId, role } })`
- **Update user data**: Use `auth.api.adminUpdateUser({ body: { userId, data } })`
- **Create user**: Use `auth.api.createUser({ body: { email, password, name, role } })`
- **Ban/unban user**: Use `auth.api.banUser()` / `auth.api.unbanUser()`
- **Manage sessions**: Use `auth.api.revokeUserSession()` / `auth.api.revokeUserSessions()`

Custom tables (`userProfile`, `userSchool`, `userMajor`, etc.) can be manipulated directly with Drizzle.

#### Server Actions

When using Server Actions in Next.js:

- Always validate inputs with Zod schemas
- Call `requireAuth`/`getAuthSession` from `~/lib/auth/auth-utils` for session data
- Return serializable data only
- Handle errors gracefully with proper error boundaries

#### Data Fetching

- Server Components: Direct database queries via Drizzle
- Client Components: Use React Query (`@tanstack/react-query`)
- Always implement loading and error states
- Use React Suspense boundaries for better UX

#### Form Handling

- Use Radix UI form primitives
- Validate with Zod schemas from `apps/web/src/lib/schemas/`
- Display errors using toast notifications (Sonner)
- Implement optimistic updates where appropriate
- Use shadcn ui reusable UI components when possible.
- use global tailwind variables where possible.
- use arrow function syntax when possible.
- remember we don't do database migrations just pushes
