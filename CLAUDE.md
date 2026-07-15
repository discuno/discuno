# AGENTS.md

This file provides guidance to AI coding assistants collaborating in this repository.

## Cross-Agent Coordination

This repository is maintained by multiple AI agents (Gemini, Claude, etc.). When you make a change that renders this file outdated, you are responsible for updating `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to reflect the new project state.

## Modernization Invariants

- Cal.com uses standard per-mentor confidential OAuth with these required scopes: `PROFILE_READ`,
  `EVENT_TYPE_READ`, `BOOKING_READ`, `BOOKING_WRITE`, `SCHEDULE_READ`, `SCHEDULE_WRITE`,
  `WEBHOOK_READ`, and `WEBHOOK_WRITE`.
- Endpoint-specific Cal.com API pins are booking create/get/cancel `2026-02-25`, booking list
  `2026-05-01`, event types `2024-06-14`, schedules `2024-06-11`, and slots `2024-09-04`.
- Every ready Cal.com connection has its own encrypted random webhook route key and signing secret.
  Requests resolve the opaque `connection` route, verify that connection's secret, and bind payload
  identity to its Discuno/Cal.com tenant before inboxing. Keep
  `CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=false`; `CALCOM_WEBHOOK_SECRET` is legacy-only.
- Legacy Platform rows are non-bookable and must reconnect. Disconnecting or switching to a
  different Cal.com account is blocked while active or financially unsettled bookings depend on the
  current identity; reconnecting the same account is the migration path.
- Custom booking fails closed for unsupported authentication, fields, recurrence, confirmation,
  Cal-managed pricing, seats, or location selection. The student supplies a normalized mobile
  number; one supported provider location is forwarded. Compatibility and duration are checked
  before Checkout and again immediately before the Cal.com POST.
- Before paid Checkout, Discuno creates a 45-minute Cal.com slot reservation and stores a durable
  bridge to a 35-minute, card-only Stripe Session. Persist and replay the exact generation-scoped
  Checkout request; roll generations only after Stripe definitively rejects a stale `expires_at`.
  Re-attest the provider hold before Stripe and require its local binding to succeed. The hold
  acquisition marker, mentor deletion guard, cleanup, and Cal.com account-switch protection share
  a 50-minute ambiguity window; internal generation rollover keeps that mentor guard pinned.
  A Cal.com reservation narrows Discuno-to-Discuno races but is not an atomic booking guarantee;
  authenticated Cal.com
  reconciliation and the refund/hold fallback remain authoritative. Expire Stripe before releasing
  an abandoned provider hold. Cleanup clears the nullable mentor guard only after the exact payment
  takes over or Stripe proves the Session expired.
- Persist a Cal.com create-attempt marker immediately before the first paid booking POST. Once a
  provider mutation may have crossed the network, retries are reconciliation-only and must never
  POST again after a negative list read. Reconcile under the payment lock before every terminal
  refund; ambiguity requires manual review, while only provider-proven absence may auto-refund.
- Cal.com webhooks, lifecycle state, account cleanup, and recovery are durable. Signed payloads enter
  a deduplicated database inbox; Inngest receives only row IDs. Tenant-owned lifecycle rows and
  side-effect leases protect out-of-order or duplicate events, while cleanup/inbox recovery jobs
  requeue stranded work and quarantine unsafe failures.
- A route-scoped Cal.com HMAC proves notification origin/routing, not a financial transition. Paid
  booking creation, cancellation/no-show handling, and payout readiness must re-read the booking
  with the mentor's OAuth token and match it to the immutable Checkout snapshot.
- Stripe server calls are pinned to `2026-06-24.dahlia`. Connect accounts use controller properties
  and request only the `transfers` capability needed for separate charges and transfers. Before a
  paid Cal.com booking, fulfillment reconciles the authoritative PaymentIntent, charge, refunds,
  and disputes under the payment lock. Holds, ambiguity, manual review, or Cal.com configuration
  drift prevent booking creation.
- Anonymous checkout IDs survive account conversion through `discuno_anonymous_user_link` and
  `resolveCanonicalUserId`; delayed workflows must resolve captured IDs rather than recover users by
  email. The link transaction also migrates safe booking/analytics/customer attribution without
  changing the permanent account's existing role.
- Better Auth email work runs through its background-task hook backed by Next.js `after()`. OTP
  requests must not await provider delivery or expose provider latency; catch failures inside the
  background task and log only fixed error categories.
- PostHog product analytics requires explicit opt-in; an unset preference remains disabled in the
  browser and on the server. Session replay is disabled even for users who enable analytics until
  there is a separate disclosure, retention policy, and consent control.
- Destructive local, preview, and test resets require a one-time database-name-confirmed guard
  (`pnpm db:guard:<environment>`) plus an exact reset confirmation. Production reset is unsupported.
- For rollout, keep `PAYMENTS_ENABLED=false`, back up each database, apply and verify schema changes
  in local/test/preview before production, validate the preview lifecycle, and enable payments only
  as a separate reversible launch decision. Repository state never implies deployed state. See
  `docs/modernization-rollout.md`.

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
pnpm test:coverage

# Run read-only Chromium smoke tests (starts local web by default)
pnpm test:e2e
# Or target a deployed preview
PLAYWRIGHT_BASE_URL=https://example.vercel.app pnpm test:e2e

# Type checking
pnpm typecheck
pnpm typecheck:tests

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

# One-time reset-guard provisioning (prints required database-name confirmation)
pnpm db:guard:local
pnpm db:guard:preview
pnpm db:guard:test

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
│   │   ├── auth/          # Auth data-access helpers and domain cache
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
- **Testing**: Vitest + Testing Library + jsdom + Playwright Chromium smoke tests
- **Type Safety**: TypeScript 6 strict mode + Zod validation
- **Package Manager**: pnpm

### Database Architecture

#### Schema Organization (`apps/web/src/server/db/schema/`)

The database schema is split by domain (e.g., `user.ts`, `mentor.ts`, `booking.ts`, `payment.ts`, `post.ts`, `analytics.ts`, `reference.ts`) and re-exported through `index.ts`, which also exposes `allTables`/`tables` for utilities. Everything uses Drizzle ORM with snake*case naming conventions and the `discuno*\*` table prefix.

**Core Tables**:

- `discuno_user`, `discuno_account`, `discuno_user_session`, `discuno_verification` - better-auth core tables
- `discuno_anonymous_user_link` - Durable guest-to-permanent identity redirects for delayed workflows
- `discuno_user_profile`, `discuno_user_major`, `discuno_user_school` - User metadata with soft deletes
- `discuno_major`, `discuno_school` - Reference data
- `discuno_post`, `discuno_mentor_review` - User-generated content
- `discuno_analytics_event` - User activity tracking for ranking algorithm

**Cal.com Integration**:

- `discuno_calcom_token` - Per-mentor OAuth identity plus encrypted access/refresh tokens and per-connection webhook route/secret; legacy Platform rows must reconnect
- `discuno_calcom_webhook_inbox` - Signed Cal.com payload inbox; Inngest receives only the row ID, retries processing, then scrubs payload data
- `discuno_calcom_webhook_cleanup` - Durable old-connection webhook cleanup outbox
- `discuno_calcom_booking_lifecycle` - Tenant-owned terminal state and exactly-once side-effect leases
- `discuno_checkout_slot_reservation` - Durable paid-attempt bridge between a temporary Cal.com slot hold and its Stripe Checkout Session
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
- Sessions use a 5-minute signed cookie cache; permission checks bypass it for immediate revocation, and security-sensitive flows enforce a 15-minute freshness window
- Better Auth rate limits use atomic Upstash counters; email OTP delivery combines a coarse IP/path
  safety bucket with an HMAC-addressed per-recipient bucket, while provider OAuth tokens are
  encrypted on write and OTP values are HMAC-hashed
- Preview OAuth uses a dedicated shared `OAUTH_PROXY_SECRET`; shared-host deployments such as
  Vercel must use exact trusted origins, while wildcards are limited to controlled custom domains
- Server components should call `requireAuth`/`getAuthSession` (wraps `auth.api.getSession`)
- Client components import `signIn`, `signOut`, and `useSession` from `authClient`
- Database hooks seed a default post, attach school metadata, process avatars, and track first login; mentors connect Cal.com from settings
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
- **Roles**: user (basic content access), mentor (.edu emails, content management + `mentor:manage`), admin (mentor/content access + explicit BetterAuth admin/session capabilities; direct `user:delete` is intentionally excluded so account deletion cannot bypass application cleanup and financial guards)

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
  return getReadyConnectionByUserId(user.id)
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

- Standard confidential OAuth connects each mentor's existing Cal.com account; access and refresh tokens are encrypted at rest and refreshed server-side
- Legacy Cal.com Platform connections are read only for migration and must reconnect through OAuth before scheduling changes
- Version-pinned schedules, event types, slots, bookings, and cancellation endpoints
- The handler at `apps/web/src/app/api/webhooks/cal/` verifies and durably stores each event before returning; `calcom/webhook.received` passes only the inbox ID to Inngest
- Booking state stored locally with Cal.com IDs as foreign keys
- Current webhook IDs are UUID strings. Provision current supported triggers including
  `MEETING_ENDED`; accept `BOOKING_COMPLETED` only as legacy inbound compatibility because current
  webhook creation does not support provisioning it.
- Account-webhook inventory uses Cal.com's `take=250`/`skip` pagination and must be scanned to
  completion before provisioning, deduplication, or cleanup; fail closed at the safety bound.
- For paid `BOOKING_CANCELLED`, an authenticated provider GET confirms booking status, identity, and
  actor. Persist the first conservative observation (the earlier of provider `updatedAt` and the
  signed envelope `createdAt`) and use it—not receipt time—for the inclusive 24-hour boundary.
- Paid booking creation carries the Discuno payment ID in Cal.com metadata. Persist the mutation
  marker before the first POST; after that boundary, retries only reconcile that metadata and never
  issue another POST.
- When the Cal UID is known, reconcile that exact authenticated booking; use bounded paginated
  metadata search only while it is unknown. Match UID/ID, event type, current schedule, duration,
  payment, mentor, actor, paying attendee, and verified reschedule lineage. Only one current
  financially relevant booking may exist per payment.
- Custom booking rejects event types that require Cal email/authentication, recurrence, confirmation, or unsupported required fields. Check compatibility both before Checkout and immediately before Cal booking creation.
- Booking attempts require a normalized mobile number, preserve one supported provider-defined location, snapshot duration, and fail closed on schedule/configuration drift.

### Stripe (`apps/web/src/lib/stripe/`)

- Stripe Connect powers mentor payouts
- Controller-property Connect accounts request the transfers-only capability and retain the Express Dashboard experience
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
- Fulfillment reconciles the authoritative PaymentIntent, charge, refunds, and disputes immediately before Cal.com creation; provider holds or ambiguous state block booking.
- A late cancellation may pay the mentor only when the authenticated provider read proves the
  canceller is the exact Checkout attendee. Unknown actors create a locked manual-review hold and
  reverse any active transfer before acknowledgement.

### PostHog Analytics

- Client tracking initializes in `apps/web/src/instrumentation-client.ts` via the `posthog-js` singleton
- Analytics events persisted for ranking calculations
- Session replay remains disabled even after product-analytics consent.

## Environment Variables

Environment validation uses `@t3-oss/env-nextjs` in `apps/web/src/env.js` to provide typed access.

See `apps/web/.env.example` for the canonical list and optional values. Core runtime groups are:

- Auth & email: at least one of legacy `BETTER_AUTH_SECRET` or versioned `BETTER_AUTH_SECRETS`, `OAUTH_PROXY_SECRET`, optional `BETTER_AUTH_URL`, `BETTER_AUTH_PRODUCTION_URL`, optional `BETTER_AUTH_TRUSTED_ORIGINS`, `AUTH_EMAIL_FROM`, optional `ADMIN_ALERT_EMAIL` (defaults to support), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `RESEND_API_KEY`
- Platform URLs: `NEXT_PUBLIC_BASE_URL`, optional `NEXT_PUBLIC_APP_URL`
- Database: `DATABASE_URL`
- Cal.com: `CALCOM_API_URL`, `CALCOM_APP_URL`, `CALCOM_OAUTH_CLIENT_ID`, `CALCOM_OAUTH_CLIENT_SECRET`, optional rotation fallback, `CALCOM_OAUTH_REDIRECT_URI`, `CALCOM_TOKEN_ENCRYPTION_KEY`, optional previous key, optional `CALCOM_WEBHOOK_URL`, optional legacy-only `CALCOM_WEBHOOK_SECRET`, `CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS` (must remain false)
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
- CI enforces measured non-regression coverage floors: 60% statements/lines, 45% branches, 55% functions
- Test files are excluded from the production build and checked separately with `pnpm typecheck:tests`
- Playwright smoke tests block authentication API calls so they never create test accounts; set `PLAYWRIGHT_BASE_URL` to target a deployed preview

## Code Style & Naming

- TypeScript strict mode; avoid `any` (prefer explicit types or `unknown`)
- Export types with implementations to aid reuse
- Path alias `~/` resolves to `apps/web/src/`
- Prefer Server Components; add `'use client'` only when necessary
- Components: PascalCase (`UserProfile.tsx`)
- Utilities: kebab-case (`format-date.ts`)
- API routes: kebab-case (`route.ts`)

## Public Copy & Positioning

Use `docs/positioning.md` as the source of truth for public-facing copy.

- Position Discuno as student-to-student guidance for a specific college decision, not as a generic mentorship platform.
- Lead with the student's question and desired next move; mention mechanics only where they remove friction.
- Use `conversation` in persuasion copy, `session` in transactional copy, and `student` instead of `mentee` outside legal/internal contexts.
- Avoid `platform`, `feature`, `integration`, `powered by`, Cal.com, and Stripe in acquisition copy.
- Describe the school-email check precisely. It supports institutional affiliation; it does not verify identity, background, expertise, or outcomes.
- Never fabricate reviews or imply guaranteed admissions, jobs, grades, placements, or other results.

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
- Apply and verify the reviewed diff in test and preview before production; coordinate each schema application with its compatible deployment
- Drizzle enforces snake_case columns via root-level configs
- Give explicit PostgreSQL constraint names when Drizzle's generated name could exceed PostgreSQL's
  63-byte identifier limit; every reviewed push must be followed by a second no-diff push.

### Webhook Development

- Resolve the opaque `connection` route, decrypt that connection's signing secret, verify the raw-body signature, and bind provider identity before inboxing
- Verify Stripe payloads via `stripe.webhooks.constructEvent()`
- Persist validated webhook payloads only in the durable inbox, pass only row IDs to Inngest, and scrub payload data after processing; do not log full payloads or secrets
- Use idempotency keys to guard against duplicates

### Rate Limiting

`apps/web/src/lib/rate-limiter.ts` applies Upstash Redis rate limits to protect public endpoints.

### Payment Processing

- Never accept price, currency, mentor payout, or connected-account values from the client; resolve them from the stored mentor and event type during Checkout creation
- Current marketplace economics are: no buyer service fee (applicable tax may still be added), 15% Discuno commission, and 85% mentor share of the listed price
- Use separate charges and transfers. Do not add `transfer_data` to Checkout; transfer the mentor share from the platform charge only after the scheduled end plus 72 hours
- Issue a full refund for mentor cancellations, mentor no-shows, and mentee cancellations at least 24 hours before the scheduled start; refundable cancellations set `mentor_payout_eligible` false
- A mentee cancellation less than 24 hours before the scheduled start is non-refundable and sets `mentor_payout_eligible` true, preserving the mentor's 85% payout after the normal scheduled-end-plus-72-hour window; use the immutable provider-confirmed first cancellation observation for this boundary
- Transfer only completed sessions, attendee no-shows, accepted sessions past their end, or cancelled bookings with `mentor_payout_eligible = true`; never transfer when refunded, disputed, under a refund hold, or marked for manual review
- Treat a Stripe refund in `requires_action` as a hard payout hold: reverse any existing mentor transfer, require manual review, and do not release mentor funds until the refund state is safely resolved
- Use the payment service for refunds, disputes, reversals, and transfers so its per-payment lock, Stripe reconciliation, ledgers, and idempotency keys remain in effect
- Inngest handles durable fulfillment and event-driven payout work; `reconcileEligibleMentorPayouts` is the hourly recovery path for missed events
- Paid Cal.com booking retries must reconcile the payment ID in booking metadata. If the durable
  create-attempt marker exists, a miss is ambiguous and must never authorize another create or an
  automatic refund.

## Useful Scripts

Database scripts reside in `apps/web/scripts/`:

- `db-seed.ts` – Seed canonical schools and majors data
- `db-reset.ts` – Reset database with safety checks
- `db-provision-reset-guard.ts` – One-time, database-name-confirmed reset authorization for local, preview, or test
- `db-push.ts` – Push schema changes to the target database
- `db-test-connection.ts` – Validate connectivity for each environment
- `dev-setup.sh` – Bootstrap local development prerequisites

## CI/CD

GitHub Actions in `.github/workflows/` run lint/format, application and test type checking, coverage-gated unit tests, guarded database tests, read-only Chromium smoke tests, dependency review, audit, and CodeQL. Dependabot groups weekly minor/patch updates. Vercel's required preview check performs the production build for each PR. Husky runs lint-staged on commit, and Commitlint enforces Conventional Commits.

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
