# AGENTS.md

This file provides guidance to AI coding assistants collaborating in this repository.

## Cross-Agent Coordination

This repository is maintained by multiple AI agents (Gemini, Claude, etc.). When you make a change that renders this file outdated, you are responsible for updating `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` to reflect the new project state.

## Project Overview

Discuno is a scheduling and mentorship platform built as a pnpm/Turborepo monorepo. The flagship product is a Next.js 15 application in `apps/web` that orchestrates Cal.com scheduling, Stripe-powered payments, and PostHog analytics. TypeScript strict mode, Drizzle ORM, and Zod validation enforce end-to-end type safety.

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

The database schema is split by domain (e.g., `user.ts`, `mentor.ts`, `booking.ts`, `payment.ts`, `post.ts`, `analytics.ts`, `reference.ts`) and re-exported through `index.ts`, which also exposes `allTables`/`tables` for utilities. Everything uses Drizzle ORM with snake*case naming conventions and the `discuno*\*` table prefix.

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

## API Integration Patterns

### Cal.com (`apps/web/src/lib/calcom/`)

- OAuth 2.0 flow for managed users within the Cal.com organization
- Token refresh logic handles expirations and retries
- Webhook handlers at `apps/web/src/app/api/webhooks/cal/`
- Booking state stored locally with Cal.com IDs as foreign keys

### Stripe (`apps/web/src/lib/stripe/`)

- Stripe Connect powers mentor payouts
- Checkout Session flow for booking payments
- Webhook handlers at `apps/web/src/app/api/webhooks/stripe/`
- Payment lifecycle: pending → processing → succeeded → transferred
- Dispute period enforced before automatic transfers

### PostHog Analytics

- Client tracking via `posthog-js` (`PostHogProvider`)
- Analytics events persisted for ranking calculations

## Environment Variables

Environment validation uses `@t3-oss/env-nextjs` in `apps/web/src/env.js` to provide typed access.

**Required Variables**:

- Auth & email: `BETTER_AUTH_SECRET`, optional `BETTER_AUTH_URL`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_SERVER`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `RESEND_API_KEY`
- Platform URLs: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_CALCOM_API_URL`
- Database: `DATABASE_URL`
- Cal.com: `CALCOM_ORG_ID`, `CALCOM_ORG_SLUG`, `CALCOM_COLLEGE_MENTORS_TEAM_SLUG`, `CALCOM_WEBHOOK_SECRET`, `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Misc: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `COLLEGE_MENTOR_TEAM_ID`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN`

Use `SKIP_ENV_VALIDATION=1` only when local experimentation requires bypassing validation.

## Testing Conventions

- Tests sit beside implementations using `.test.ts` or `.spec.ts`
- Vitest configuration: `apps/web/vitest.config.ts` with path alias resolution
- **Global setup** in `apps/web/src/server/__tests__/global-setup.ts` - runs once before all tests to reset database (prevents race conditions)
- **Per-file setup** in `apps/web/src/server/__tests__/setup.ts` - runs for each test file (mocks, cleanup)
- Tests run sequentially (`singleThread: true`) to prevent database conflicts
- Use `.env.test` for test-only secrets
- Database specs rely on dedicated test database URLs
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
- Do not edit generated files in `drizzle/`
- Make schema changes inside `apps/web/src/server/db/schema/*.ts` (and export via `index.ts`)
- Regenerate with `pnpm db:generate` (references root-level config)
- Validate migrations locally before release
- Drizzle enforces snake_case columns via root-level configs

### Webhook Development

- Verify Cal.com signatures with `CALCOM_WEBHOOK_SECRET`
- Verify Stripe payloads via `stripe.webhooks.constructEvent()`
- Persist raw webhook payloads for auditing
- Use idempotency keys to guard against duplicates

### Rate Limiting

`apps/web/src/lib/rate-limiter.ts` applies Upstash Redis rate limits to protect public endpoints.

### Payment Processing

- Platform fee logic lives where payments are created
- Disputes hold payouts for 7 days after booking completion
- Cron jobs transfer funds automatically post-dispute window
- Handle refunds for cancelled bookings gracefully

## Useful Scripts

Database scripts reside in `apps/web/scripts/`:

- `db-seed.ts` – Seed canonical schools and majors data
- `db-reset.ts` – Reset database with safety checks
- `db-push.ts` – Push schema changes to the target database
- `db-test-connection.ts` – Validate connectivity for each environment
- `dev-setup.sh` – Bootstrap local development prerequisites

## CI/CD

GitHub Actions in `.github/workflows/` handle CI (lint, typecheck, test, build). Husky runs lint-staged on commit, and Commitlint enforces Conventional Commits.

## Deployment

- **Vercel CLI** used for local development and manual deployments
- Optimized for Vercel; environment variables managed via Vercel dashboard or `vercel env` commands
- Automatic deploys from `main`
- Preview builds for every PR
- Railway provides branching for preview databases
- Use `vercel --prod` for manual production deployments (when needed)

## Known Patterns

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
