# GEMINI.md

This playbook guides Google Gemini (and other Gemini-based coding agents) when contributing to this repository.

## Cross-Agent Coordination

This repository is maintained by multiple AI agents (Gemini, Claude, etc.). When you make a change that renders this file outdated, you are responsible for updating `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to reflect the new project state.

## Project Overview

Discuno is a scheduling and mentorship platform built on a pnpm/Turborepo monorepo. The flagship app lives in `apps/web` and runs on Next.js 15 with React Server Components, coordinating Cal.com scheduling, Stripe payouts, and PostHog analytics. TypeScript strict mode, Drizzle ORM, and Zod schemas ensure typed workflows from database to UI.

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

Schemas live in domain-specific files (`user.ts`, `mentor.ts`, `booking.ts`, `payment.ts`, `post.ts`, `analytics.ts`, `reference.ts`) that Drizzle re-exports through `index.ts` (also exposing `allTables`/`tables`). Everything keeps snake*case tables prefixed with `discuno*\*`.

**Core Tables**:

- `discuno_user`, `discuno_account`, `discuno_user_session`, `discuno_verification`
- `discuno_user_profile`, `discuno_user_major`, `discuno_user_school`
- `discuno_major`, `discuno_school`
- `discuno_post`, `discuno_mentor_review`
- `discuno_analytics_event`

**Cal.com Integration**:

- `discuno_calcom_token`
- `discuno_mentor_event_type`
- `discuno_booking`
- `discuno_booking_attendee`, `discuno_booking_organizer`

**Stripe Integration**:

- `discuno_mentor_stripe_account`
- `discuno_payment`

**Patterns**:

- Soft deletes via `softDeleteTimestamps`
- Compound indexes for hot paths
- Cascade/set-null foreign keys
- JSON columns for flexible metadata

#### Database Queries

Use `apps/web/src/server/queries/` (domain modules) and `apps/web/src/server/dal/` helpers for high-level data access instead of ad-hoc SQL.

## Authentication Architecture

better-auth lives in `apps/web/src/lib/auth.ts` with helpers in `apps/web/src/lib/auth-client.ts` and `apps/web/src/lib/auth/auth-utils.ts`:

- Providers: Google, Microsoft Entra ID (OAuth), and email OTP
- Drizzle adapter backed by PostgreSQL tables
- Server components call `requireAuth`/`getAuthSession` (wraps `auth.api.getSession`)
- Client surfaces import `signIn`, `signOut`, and `useSession` from `authClient`
- Database hooks handle Cal.com onboarding, initial post seeding, and school assignment during first login

## Access Control (ACL)

Uses BetterAuth's ACL for permission-based access control. **Use `requirePermission()`, not role checks.**

### Key Points

- Check permissions (`requirePermission({ resource: ['action'] })`), not roles (`user.role === 'mentor'`)
- Resources: availability, eventType, booking, stripeAccount, payment, profile, post, analytics
- Roles: user (basic), mentor (.edu, +scheduling/payments), admin (all)

### Server Functions

```typescript
await requirePermission({ availability: ['read'] }) // Throws
await hasPermission({ eventType: ['update'] }) // Boolean
```

### Client Functions

```typescript
authClient.admin.hasPermission({ permissions: { ... } })           // Async
authClient.admin.checkRolePermission({ permissions, role })       // Sync
```

See `apps/web/src/lib/auth/permissions.ts` for full model.

### Data Access Layer Protection Pattern

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

## API Integration Patterns

### Cal.com (`apps/web/src/lib/calcom/`)

- OAuth 2.0 tokens with refresh handling
- Webhook handlers at `apps/web/src/app/api/webhooks/cal/`
- Local persistence of booking snapshots tied to Cal.com IDs

### Stripe (`apps/web/src/lib/stripe/`)

- Stripe Connect for mentor payouts
- Checkout Session flow for bookings
- Webhook handlers at `apps/web/src/app/api/webhooks/stripe/`
- Payment lifecycle includes dispute window before transfers

### PostHog

- Client analytics via `posthog-js` (`PostHogProvider`)
- Data feeds the ranking algorithms

## Environment Variables

Environment validation relies on `@t3-oss/env-nextjs` (`apps/web/src/env.js`).

**Required Variables**:

- Auth & email: `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_SERVER`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `RESEND_API_KEY`
- Platform URLs: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_CALCOM_API_URL`
- Database: `DATABASE_URL`
- Cal.com: `CALCOM_ORG_ID`, `CALCOM_ORG_SLUG`, `CALCOM_COLLEGE_MENTORS_TEAM_SLUG`, `CALCOM_WEBHOOK_SECRET`, `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Misc: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `COLLEGE_MENTOR_TEAM_ID`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN`

Use `SKIP_ENV_VALIDATION=1` only when intentionally bypassing validation locally.

## Testing Conventions

- Colocate `.test.ts` or `.spec.ts` next to implementation files
- Vitest config at `apps/web/vitest.config.ts` with path alias resolution
- **Global setup** in `apps/web/src/server/__tests__/global-setup.ts` - runs once before all tests to reset database (prevents race conditions)
- **Per-file setup** in `apps/web/src/server/__tests__/setup.ts` - runs for each test file (mocks, cleanup)
- Tests run sequentially (`singleThread: true`) to prevent database conflicts
- `.env.test` holds test-only secrets
- Dedicated test database URLs for DB specs
- Coverage targets: 80% statements, 70% branches, 80% functions/lines
- Test files excluded from main TypeScript build via `tsconfig.json` exclude patterns

## Code Style & Naming

- TypeScript strict; avoid `any` unless cast to `unknown` first
- Export types with their implementations
- Use `~/` alias for `apps/web/src/`
- Favor Server Components; add `'use client'` sparingly
- Components: PascalCase; utilities: kebab-case; API routes: kebab-case `route.ts`

## Development Notes

### Cache Components

- Next.js Cache Components are enabled with `cacheComponents: true` in `apps/web/next.config.js`
- Use the `'use cache'` directive when a component or function should be cached; dynamic logic remains request-scoped by default

### Mentor Dashboard

Review `.cursor/rules/mentor-dashboard.md` for UX, analytics, and payment expectations across dashboard modules.

### Database Migrations

- **Drizzle configs live at root level**: `drizzle.config.ts`, `drizzle.local.config.ts`, `drizzle.preview.config.ts`, `drizzle.production.config.ts`, `drizzle.test.config.ts`
- Database scripts in `apps/web/scripts/` reference root configs with relative paths (`../../drizzle.*.config.ts`)
- Never hand-edit generated files in `drizzle/`
- Apply schema adjustments within `apps/web/src/server/db/schema/*.ts` (and ensure `index.ts` exports them)
- Re-run `pnpm db:generate` after changes (references root-level config)
- Test migrations locally prior to release
- snake_case columns enforced via root-level Drizzle configs

### Webhooks

- Validate Cal.com signatures with `CALCOM_WEBHOOK_SECRET`
- Validate Stripe payloads via `stripe.webhooks.constructEvent()`
- Store raw webhook payloads for audits
- Use idempotency keys when mutating state

### Rate Limiting

`apps/web/src/lib/rate-limiter.ts` wraps Upstash Redis logic for protecting public endpoints.

### Payments

- Platform fees computed during payment creation
- Hold payouts for 7 days post-booking to cover disputes
- Cron jobs push transfers after the dispute window
- Support refunds for cancellations

## Useful Scripts

Key scripts in `apps/web/scripts/`:

- `db-seed.ts`
- `db-reset.ts`
- `db-push.ts`
- `db-test-connection.ts`
- `dev-setup.sh`

## CI/CD

GitHub Actions manage lint, typecheck, test, and build. Husky + lint-staged run pre-commit, and Commitlint enforces Conventional Commits.

## Deployment

- **Vercel CLI** used for local development and manual deployments
- Vercel hosts the app; env vars managed via Vercel dashboard or `vercel env` commands
- `main` auto-deploys; PRs create preview builds
- Railway handles preview database branches
- Use `vercel --prod` for manual production deployments (when needed)

## Known Patterns

### BetterAuth Tables

**IMPORTANT**: For MVP simplicity, we directly update the `user` table using Drizzle ORM for role and image updates. The admin plugin is kept for ACL permission checking (`userHasPermission`) but not for user management.

- **Set user role**: Update directly via Drizzle: `db.update(schema.user).set({ role }).where(eq(schema.user.id, userId))`
- **Update user image**: Update directly via Drizzle: `db.update(schema.user).set({ image }).where(eq(schema.user.id, userId))`

Custom tables (`userProfile`, `userSchool`, `userMajor`, etc.) can be manipulated directly with Drizzle.

Note: The admin plugin is still enabled for permission checking via `auth.api.userHasPermission()` used in the ACL system.

### Server Actions

- Validate inputs with Zod
- Use `requireAuth`/`getAuthSession` from `~/lib/auth/auth-utils` for session reads
- Return serializable objects only
- Wrap with error boundaries

### Data Fetching

- Server Components query via Drizzle
- Client Components use React Query
- Always add loading/error states
- Use Suspense boundaries for UX polish

### Form Handling

- Rely on Radix primitives and shadcn/ui
- Validate with Zod schemas in `apps/web/src/lib/schemas/`
- Surface errors using Sonner toasts
- Prefer optimistic updates
- Reuse Tailwind tokens and arrow function components
- Favor schema pushes over manual migrations
