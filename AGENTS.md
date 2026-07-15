# AGENTS.md

This file provides guidance to AI coding assistants collaborating in this repository.

## Cross-Agent Coordination

This repository is maintained by multiple AI agents (Gemini, Claude, etc.). When you make a change that renders this file outdated, you are responsible for updating `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to reflect the new project state.

## Project Overview

Discuno is a scheduling and mentorship platform built as a pnpm/Turborepo monorepo. The flagship product is a Next.js 16 application in `apps/web` that orchestrates Cal.com scheduling, Stripe-powered payments, and PostHog analytics. TypeScript strict mode, Drizzle ORM, and Zod validation enforce end-to-end type safety.

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

# Run database integration tests against Railway's guarded test environment
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
# Push schema changes to a named database (always inspect the interactive diff)
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

The database schema is split by domain (e.g., `user.ts`, `mentor.ts`, `booking.ts`, `payment.ts`, `post.ts`, `analytics.ts`, `reference.ts`) and re-exported through `index.ts`, which also exposes `allTables`/`tables` for utilities. Everything uses Drizzle ORM with snake*case naming conventions and the `discuno*\*` table prefix.

**Core Tables**:

- `discuno_user`, `discuno_account`, `discuno_user_session`, `discuno_verification` - better-auth core tables
- `discuno_user_profile`, `discuno_user_major`, `discuno_user_school` - User metadata with soft deletes
- `discuno_major`, `discuno_school` - Reference data
- `discuno_post`, `discuno_mentor_review` - User-generated content
- `discuno_analytics_event` - User activity tracking for ranking algorithm

**Cal.com Integration**:

- `discuno_calcom_token` - Cal.com organization-user identity; token columns are nullable legacy compatibility fields
- `discuno_mentor_event_type` - Mentor availability & pricing snapshots
- `discuno_booking` - Booking snapshots from Cal.com webhooks; `mentor_payout_eligible` explicitly distinguishes a payable late mentee cancellation from refundable cancellations
- `discuno_booking_attendee`, `discuno_booking_organizer` - Normalized booking participants

**Stripe Integration**:

- `discuno_user.stripe_customer_id` - Stripe Customer bound to a Discuno user; never reuse a customer by matching email
- `discuno_mentor_stripe_account` - Connected account information
- `discuno_payment` - Canonical payment, booking, refund, transfer, and manual-review snapshot
- `discuno_payment_transfer`, `discuno_payment_refund`, `discuno_payment_dispute` - Durable per-object ledgers for Stripe reconciliation and audit history

**Important Patterns**:

- Soft deletes via `softDeleteTimestamps` helper (`deleted_at`, `created_at`, `updated_at`)
- Compound indexes for common query patterns
- Foreign keys with cascade/set-null policies
- JSON columns for flexible metadata storage

#### Database Queries

All database queries live in `apps/web/src/server/queries/` (scoped per domain) with complementary helpers in `apps/web/src/server/dal/`. Prefer these exports over ad-hoc SQL so business logic stays consistent.

## Authentication Architecture

better-auth is configured in `apps/web/src/lib/auth.ts` with helpers in `apps/web/src/lib/auth-client.ts` and `apps/web/src/lib/auth/auth-utils.ts`:

- **Providers**: Google, Microsoft Entra ID (OAuth), and email OTP
- **Adapter**: Drizzle adapter backed by PostgreSQL tables
- Server components should call `requireAuth`/`getAuthSession` (wraps `auth.api.getSession`)
- Client components import `signIn`, `signOut`, and `useSession` from `authClient`
- Database hooks enforce Cal.com onboarding, seed a default post, and attach school metadata on first login
- Database hooks assign `user`/`mentor` roles with direct Drizzle updates; the BetterAuth admin plugin remains enabled for ACL permission checks, not user management

## Access Control (ACL) System

Discuno uses BetterAuth's ACL framework for permission-based access control. **Always use `requirePermission()` instead of role checks.**

### Core Principle

Check permissions, not roles. For example, use `requirePermission({ mentor: ['manage'] })` instead of checking `user.role`.

### Key Functions

**Server-Side:**

- `requirePermission(permissions)` - Throws if user lacks permission
- `hasPermission(permissions)` - Returns boolean, no throw

**Client-Side:**

- `authClient.admin.hasPermission({ permissions })` - Async permission check
- `authClient.admin.checkRolePermission({ permissions, role })` - Sync role permission check

### Resources & Roles

- **`mentor:manage`**: all mentor dashboard data, including availability, event types, bookings, profiles, Stripe accounts, and payments
- **`content:create|read|update|delete`**: user-authored content; ordinary users receive create/read, while mentors and admins receive all four actions
- BetterAuth's default `user` and `session` resources remain available to its admin plugin
- **Roles**: user (basic content access), mentor (.edu emails, content management + `mentor:manage`), admin (mentor/content access + BetterAuth admin capabilities)

### Examples

```typescript
// Query-layer security boundary
export const getMentorEventTypes = cache(async () => {
  const { user } = await requirePermission({ mentor: ['manage'] })
  return getEventTypesByUserId(user.id)
})
```

Layouts may repeat a permission check for an earlier UX redirect. Server actions and services must
delegate to a protected query instead of becoming a separate authorization boundary.

See `apps/web/src/lib/auth/permissions.ts` for complete permission model.

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

- Supported organization-user and team-membership APIs with platform credentials
- Version-pinned schedules, event types, slots, bookings, and cancellation endpoints
- Webhook handlers at `apps/web/src/app/api/webhooks/cal/`
- Booking state stored locally with Cal.com IDs as foreign keys
- For `BOOKING_CANCELLED`, use the Cal event envelope's `createdAt` timestamp—not webhook receipt time—to apply the inclusive 24-hour refund boundary
- Paid booking creation carries the Discuno payment ID in Cal.com metadata; retries reconcile that metadata before issuing another create request
- Custom booking rejects event types that require Cal email/authentication, recurrence, confirmation, or unsupported required fields. Check compatibility both before Checkout and immediately before Cal booking creation.

### Stripe (`apps/web/src/lib/stripe/`)

- Stripe Connect powers mentor payouts
- Controller-property Connect accounts retain the Express Dashboard experience
- Paid Checkout is server-authoritative: the server resolves the mentor, event type, listed price, currency, duration, and connected account
- Stripe Customers are bound by Discuno user ID rather than email matching
- Mentees pay the listed session price plus applicable tax with no Discuno buyer service fee; Discuno retains a 15% mentor-side commission
- The platform uses separate charges and transfers: the platform charge settles first, then the mentor's 85% share becomes eligible after the scheduled session end plus 72 hours
- Checkout fulfillment waits for paid sessions and handles delayed payment methods
- Webhook handlers at `apps/web/src/app/api/webhooks/stripe/`
- Durable, idempotent fulfillment and payout work is queued through Inngest; an hourly reconciliation function recovers missed or delayed payout events
- Per-payment database locks, Stripe-side object reconciliation, and transfer/refund/dispute ledgers protect retries and out-of-order webhooks
- Pending and `requires_action` refunds, successful refunds, and active disputes hold or reverse mentor transfers; `requires_action` also forces manual review until resolved
- Payments marked for manual review are excluded from automatic transfers
- A late cancellation may pay the mentor only when the canceller is proven to be an attendee. Unknown actors create a locked manual-review hold and reverse any active transfer before acknowledgement.

### PostHog Analytics

- Client tracking initializes in `apps/web/src/instrumentation-client.ts` via the `posthog-js` singleton
- Analytics events persisted for ranking calculations

## Environment Variables

Environment validation uses `@t3-oss/env-nextjs` in `apps/web/src/env.js` to provide typed access.

See `apps/web/.env.example` for the canonical list and optional values. Core runtime groups are:

- Auth & email: `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL`, `AUTH_EMAIL_FROM`, optional `ADMIN_ALERT_EMAIL` (defaults to support), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `RESEND_API_KEY`
- Platform URLs: `NEXT_PUBLIC_BASE_URL`, optional `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CALCOM_API_URL`
- Database: `DATABASE_URL`
- Cal.com: `CALCOM_ORG_ID`, `COLLEGE_MENTOR_TEAM_ID`, `CALCOM_WEBHOOK_SECRET`, `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `PAYMENTS_ENABLED` (server-side launch/incident switch; defaults false)
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Misc: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`

Use `SKIP_ENV_VALIDATION=1` only when local experimentation requires bypassing validation.

## Testing Conventions

- Tests sit beside implementations using `.test.ts` or `.spec.ts`
- Unit-test configuration: `apps/web/vitest.config.ts`; unit runs never reset a database
- Integration configuration: `apps/web/vitest.integration.config.ts`
- Integration global setup resets only a database containing `_discuno_test_environment_guard` with the expected marker
- Database specs run sequentially against Railway's dedicated `test` environment
- `.env.test` is optional; injected `DATABASE_URL` values are supported
- Coverage thresholds: 80% statements, 70% branches, 80% functions/lines
- Test files excluded from main TypeScript build via `tsconfig.json` exclude patterns

## Code Style & Naming

- TypeScript strict mode; avoid `any` (prefer explicit types or `unknown`)
- Export types with implementations to aid reuse
- Path alias `~/` resolves to `apps/web/src/`
- Prefer Server Components; add `'use client'` only when necessary
- Components: PascalCase (`UserProfile.tsx`)
- Utilities: kebab-case (`format-date.ts`)
- API routes: kebab-case (`route.ts`)

## Development Notes

### Cache Components

- Next.js Cache Components are enabled with `cacheComponents: true` in `apps/web/next.config.js`
- Opt into caching explicitly with the `'use cache'` directive; dynamic code still runs at request time by default

### Mentor Dashboard

Consult `.cursor/rules/mentor-dashboard.md` for UI and data requirements: meeting management, payout visibility, Stripe onboarding state, analytics widgets, and notifications.

### Database Migrations

- **Drizzle configs live at root level**: `drizzle.config.ts`, `drizzle.local.config.ts`, `drizzle.preview.config.ts`, `drizzle.production.config.ts`, `drizzle.test.config.ts`
- Database scripts in `apps/web/scripts/` reference root configs with relative paths (`../../drizzle.*.config.ts`)
- Make schema changes inside `apps/web/src/server/db/schema/*.ts` (and export via `index.ts`)
- This repository uses reviewed Drizzle schema pushes, not generated migration files
- Run `pnpm db:push:local` first and confirm a second run reports no changes
- Preview shared-environment diffs and coordinate schema application with deployment
- Drizzle enforces snake_case columns via root-level configs

### Webhook Development

- Verify Cal.com signatures with `CALCOM_WEBHOOK_SECRET`
- Verify Stripe payloads via `stripe.webhooks.constructEvent()`
- Persist validated webhook payloads for auditing; do not log full payloads or secrets
- Use idempotency keys to guard against duplicates

### Rate Limiting

`apps/web/src/lib/rate-limiter.ts` applies Upstash Redis rate limits to protect public endpoints.

### Payment Processing

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

Database scripts reside in `apps/web/scripts/`:

- `db-seed.ts` – Seed canonical schools and majors data
- `db-reset.ts` – Reset database with safety checks
- `db-push.ts` – Push schema changes to the target database
- `db-test-connection.ts` – Validate connectivity for each environment
- `dev-setup.sh` – Bootstrap local development prerequisites

## CI/CD

GitHub Actions in `.github/workflows/` run lint/format, type checking, unit and guarded database tests, dependency review, audit, and CodeQL. Vercel's required preview check performs the production build for each PR. Husky runs lint-staged on commit, and Commitlint enforces Conventional Commits.

## Deployment

- **Vercel CLI** used for local development and manual deployments
- Optimized for Vercel; environment variables managed via Vercel dashboard or `vercel env` commands
- Automatic deploys from `main`
- Preview builds for every PR
- Railway provides branching for preview databases
- Use `vercel --prod` for manual production deployments (when needed)

## Known Patterns

### BetterAuth Tables

**IMPORTANT**: For MVP simplicity, we directly update the `user` table using Drizzle ORM for role and image updates. The admin plugin is kept for ACL permission checking (`userHasPermission`) but not for user management.

- **Set user role**: Update directly via Drizzle: `db.update(schema.user).set({ role }).where(eq(schema.user.id, userId))`
- **Update user image**: Update directly via Drizzle: `db.update(schema.user).set({ image }).where(eq(schema.user.id, userId))`

Custom tables (`userProfile`, `userSchool`, `userMajor`, etc.) can be manipulated directly with Drizzle.

Note: The admin plugin is still enabled for permission checking via `auth.api.userHasPermission()` used in the ACL system.

### Server Actions

- Validate inputs with Zod schemas
- Call `requireAuth`/`getAuthSession` from `~/lib/auth/auth-utils` to fetch the current session
- Return serializable payloads only
- Guard with error boundaries for graceful failure

### Data Fetching

- Server Components may query the database directly via Drizzle
- Client Components should use React Query (`@tanstack/react-query`)
- Always cover loading and error states
- Employ React Suspense for smoother UX

### Form Handling

- Use Radix UI primitives and shadcn/ui components
- Validate with Zod schemas in `apps/web/src/lib/schemas/`
- Surface errors with Sonner toasts
- Prefer optimistic updates when feasible
- Reuse Tailwind design tokens and write components using arrow functions
- Favor schema pushes over ad-hoc database migrations
