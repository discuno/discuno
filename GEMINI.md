# GEMINI.md

This playbook guides Google Gemini (and other Gemini-based coding agents) when contributing to this repository.

## Cross-Agent Coordination

This repository is maintained by multiple AI agents (Gemini, Claude, etc.). When you make a change that renders this file outdated, you are responsible for updating `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to reflect the new project state.

## Project Overview

Discuno is a scheduling and mentorship platform built on a pnpm/Turborepo monorepo. The flagship app lives in `apps/web` and runs on Next.js 16 with React Server Components, coordinating Cal.com scheduling, Stripe payouts, and PostHog analytics. TypeScript strict mode, Drizzle ORM, and Zod schemas ensure typed workflows from database to UI.

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

# Read-only connectivity checks (local, preview, production)
pnpm integrations:check:local
pnpm integrations:check:preview
pnpm integrations:check:prod
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
# Run unit tests once
pnpm test:run

# Run guarded database integration tests
railway run --environment test --service Postgres zsh -c 'export DATABASE_URL="$DATABASE_PUBLIC_URL"; pnpm test:integration'

# Run unit tests in watch mode
pnpm --filter @discuno/web test

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
# Push schema changes to a named database and inspect the interactive diff
pnpm db:push:local
pnpm db:push:preview
pnpm db:push:prod

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
pnpm --filter @discuno/web exec vitest run src/path/to/file.test.ts

# Run tests in watch mode for a specific file
pnpm --filter @discuno/web exec vitest src/path/to/file.test.ts
```

## Architecture

### Monorepo Structure

- **pnpm workspaces** for package management
- **Turborepo** for build orchestration and caching
- Single application: `apps/web` (Next.js 16)
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
├── scripts/               # Database scripts & utilities (reference root configs)
└── public/                # Static assets
```

#### Key Technologies

- **Framework**: Next.js 16 with App Router and Turbopack
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

- `discuno_calcom_token` (organization-user identity; nullable token columns are legacy only)
- `discuno_mentor_event_type`
- `discuno_booking` - Includes `mentor_payout_eligible` to distinguish a payable late mentee cancellation from refundable cancellations
- `discuno_booking_attendee`, `discuno_booking_organizer`

**Stripe Integration**:

- `discuno_user.stripe_customer_id` - Stripe Customer bound to a Discuno user; never reuse a customer by matching email
- `discuno_mentor_stripe_account` - Connected account information
- `discuno_payment` - Canonical payment, booking, refund, transfer, and manual-review snapshot
- `discuno_payment_transfer`, `discuno_payment_refund`, `discuno_payment_dispute` - Durable per-object ledgers for Stripe reconciliation and audit history

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
- Database hooks assign `user`/`mentor` roles with direct Drizzle updates; the BetterAuth admin plugin remains enabled for ACL permission checks, not user management

## Access Control (ACL)

Uses BetterAuth's ACL for permission-based access control. **Use `requirePermission()`, not role checks.**

### Key Points

- Check permissions (`requirePermission({ mentor: ['manage'] })`), not roles (`user.role === 'mentor'`)
- Resources: `mentor:manage` for all mentor dashboard data and `content:create|read|update|delete` for user-authored content; BetterAuth also supplies its admin resources
- Roles: user (content create/read), mentor (.edu, full content + mentor management), admin (mentor/content + BetterAuth administration)

### Server Functions

Use these in protected query modules. Layout checks are optional UX redirects; server actions and
services delegate to protected queries instead of becoming separate authorization boundaries.

```typescript
await requirePermission({ mentor: ['manage'] }) // Throws
await hasPermission({ content: ['update'] }) // Boolean
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
export const getMentorCalcomConnection = cache(async () => {
  const { user } = await requirePermission({ mentor: ['manage'] }) // ← SECURITY HERE
  return getCalcomConnectionByUserId(user.id)
})

// apps/web/src/app/(app)/(mentor)/settings/actions.ts
export async function getSchedule() {
  // No permission check - protected by getMentorCalcomConnection()
  const connection = await getMentorCalcomConnection() // ← Protected by query
}
```

Keep this query-layer boundary intact; layout redirects are only a UX optimization and are not the authorization control.

## API Integration Patterns

### Cal.com (`apps/web/src/lib/calcom/`)

- Supported Cal.com organization-user/team APIs with platform credentials
- Version-pinned schedules, event types, slots, bookings, and cancellation endpoints
- Webhook handlers at `apps/web/src/app/api/webhooks/cal/`
- Local persistence of booking snapshots tied to Cal.com IDs
- For `BOOKING_CANCELLED`, use the Cal event envelope's `createdAt` timestamp—not webhook receipt time—to apply the inclusive 24-hour refund boundary
- Paid booking creation carries the Discuno payment ID in Cal.com metadata; retries reconcile that metadata before issuing another create request

### Stripe (`apps/web/src/lib/stripe/`)

- Stripe Connect for mentor payouts
- Controller-property accounts preserve the Express Dashboard experience
- Paid Checkout is server-authoritative: the server resolves the mentor, event type, listed price, currency, duration, and connected account
- Stripe Customers are bound by Discuno user ID rather than email matching
- Mentees pay the listed session price plus applicable tax with no Discuno buyer service fee; Discuno retains a 15% mentor-side commission
- The platform uses separate charges and transfers: the platform charge settles first, then the mentor's 85% share becomes eligible after the scheduled session end plus 72 hours
- Checkout fulfills paid sessions (including delayed methods) through idempotent Inngest events
- Webhook handlers at `apps/web/src/app/api/webhooks/stripe/`
- Durable, idempotent fulfillment and payout work is queued through Inngest; an hourly reconciliation function recovers missed or delayed payout events
- Per-payment database locks, Stripe-side object reconciliation, and transfer/refund/dispute ledgers protect retries and out-of-order webhooks
- Pending and `requires_action` refunds, successful refunds, and active disputes hold or reverse mentor transfers; `requires_action` also forces manual review until resolved
- Payments marked for manual review are excluded from automatic transfers

### PostHog

- Client analytics initialize in `apps/web/src/instrumentation-client.ts` via the `posthog-js` singleton
- Data feeds the ranking algorithms

## Environment Variables

Environment validation relies on `@t3-oss/env-nextjs` (`apps/web/src/env.js`).

See `apps/web/.env.example` for the canonical list and optional values. Core runtime groups are:

- Auth & email: `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL`, `AUTH_EMAIL_FROM`, optional `ADMIN_ALERT_EMAIL` (defaults to support), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `RESEND_API_KEY`
- Platform URLs: `NEXT_PUBLIC_BASE_URL`, optional `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CALCOM_API_URL`
- Database: `DATABASE_URL`
- Cal.com: `CALCOM_ORG_ID`, `COLLEGE_MENTOR_TEAM_ID`, `CALCOM_WEBHOOK_SECRET`, `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `PAYMENTS_ENABLED` (server-side launch/incident switch; defaults false)
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Misc: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`

Use `SKIP_ENV_VALIDATION=1` only when intentionally bypassing validation locally.

## Testing Conventions

- Colocate `.test.ts` or `.spec.ts` next to implementation files
- `apps/web/vitest.config.ts` runs unit tests and never resets a database
- `apps/web/vitest.integration.config.ts` runs database specs sequentially
- Integration setup resets only a database containing the expected `_discuno_test_environment_guard` marker
- `.env.test` is optional; Railway-injected `DATABASE_URL` values are supported
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
- Apply schema adjustments within `apps/web/src/server/db/schema/*.ts` (and ensure `index.ts` exports them)
- This repository uses reviewed Drizzle schema pushes, not generated migration files
- Run `pnpm db:push:local` first and confirm a second run reports no changes
- Preview shared-environment diffs and coordinate schema application with deployment
- snake_case columns enforced via root-level Drizzle configs

### Webhooks

- Validate Cal.com signatures with `CALCOM_WEBHOOK_SECRET`
- Validate Stripe payloads via `stripe.webhooks.constructEvent()`
- Store validated webhook payloads for audits; never log full payloads or secrets
- Use idempotency keys when mutating state

### Rate Limiting

`apps/web/src/lib/rate-limiter.ts` wraps Upstash Redis logic for protecting public endpoints.

### Payments

- Never accept price, currency, mentor payout, or connected-account values from the client; resolve them from the stored mentor and event type during Checkout creation
- Current marketplace economics are: no buyer service fee (applicable tax may still be added), 15% Discuno commission, and 85% mentor share of the listed price
- Use separate charges and transfers. Do not add `transfer_data` to Checkout; transfer the mentor share from the platform charge only after the scheduled end plus 72 hours
- Issue a full refund for mentor cancellations, mentor no-shows, and mentee cancellations at least 24 hours before the scheduled start; refundable cancellations set `mentor_payout_eligible` false
- A mentee cancellation less than 24 hours before the scheduled start is non-refundable and sets `mentor_payout_eligible` true, preserving the mentor's 85% payout after the normal scheduled-end-plus-72-hour window; use the Cal cancellation event's `createdAt` for this boundary
- Transfer only completed sessions, attendee no-shows, accepted sessions past their end, or cancelled bookings with `mentor_payout_eligible = true`; never transfer when refunded, disputed, under a refund hold, or marked for manual review
- Treat a Stripe refund in `requires_action` as a hard payout hold: reverse any existing mentor transfer, require manual review, and do not release mentor funds until the refund state is safely resolved
- Use the payment service for refunds, disputes, reversals, and transfers so its per-payment lock, Stripe reconciliation, ledgers, and idempotency keys remain in effect
- Inngest handles durable fulfillment and event-driven payout work; `reconcileEligibleMentorPayouts` is the hourly recovery path for missed events
- Paid Cal.com booking retries must reconcile the payment ID in booking metadata before attempting another create

## Useful Scripts

Key scripts in `apps/web/scripts/`:

- `db-seed.ts`
- `db-reset.ts`
- `db-push.ts`
- `db-test-connection.ts`
- `dev-setup.sh`

## CI/CD

GitHub Actions run lint/format, type checking, unit and guarded database tests, dependency review, audit, and CodeQL. Vercel's required preview check performs the production build for each PR. Husky + lint-staged run pre-commit, and Commitlint enforces Conventional Commits.

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
