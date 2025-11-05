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
- Shared configuration at the repository root

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
├── scripts/               # Database scripts & utilities
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

#### Schema Organization (`apps/web/src/server/db/schema.ts`)

Drizzle ORM uses snake*case tables prefixed with `discuno*`.

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
- Vitest config at `apps/web/vitest.config.ts`
- Setup via `apps/web/vitest.setup.ts`
- `.env.test` holds test-only secrets
- Dedicated test database URLs for DB specs
- Coverage targets: 80% statements, 70% branches, 80% functions/lines

## Code Style & Naming

- TypeScript strict; avoid `any` unless cast to `unknown` first
- Export types with their implementations
- Use `~/` alias for `apps/web/src/`
- Favor Server Components; add `'use client'` sparingly
- Components: PascalCase; utilities: kebab-case; API routes: kebab-case `route.ts`

## Development Notes

### Mentor Dashboard

Review `.cursor/rules/mentor-dashboard.md` for UX, analytics, and payment expectations across dashboard modules.

### Database Migrations

- Never hand-edit generated files in `drizzle/`
- Apply schema adjustments in `apps/web/src/server/db/schema.ts`
- Re-run `pnpm db:generate` after changes
- Test migrations locally prior to release
- snake_case columns enforced via Drizzle config

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

- Vercel hosts the app; env vars configured in the Vercel dashboard
- `main` auto-deploys; PRs create preview builds
- Railway handles preview database branches

## Known Patterns

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
