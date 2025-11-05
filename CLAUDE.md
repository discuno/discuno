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
- All configuration files at root level

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

The database schema uses Drizzle ORM with snake*case naming convention and the `discuno*` table prefix.

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
- Test configuration in `apps/web/vitest.config.ts`
- Setup files in `apps/web/src/server/__tests__/setup.ts`
- Use `.env.test` for test environment variables
- Test database operations use separate test database URLs
- Coverage thresholds: 80% statements, 70% branches, 80% functions/lines

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

#### Mentor Dashboard Requirements

Reference `.cursor/rules/mentor-dashboard.md` for mentor dashboard specifications including:

- Meeting management (upcoming, past, cancelled)
- Payment tracking (pending, payouts)
- Stripe account status
- Analytics and notifications

#### Database Migrations

- Never edit generated migration files in `drizzle/`
- Always modify `apps/web/src/server/db/schema.ts` and regenerate
- Use `pnpm db:generate` to create new migrations
- Test migrations in local environment before deploying
- Drizzle uses snake_case for column names (configured in drizzle.config.ts)

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

- Environment variables configured in Vercel dashboard
- Automatic deployments from `main` branch
- Preview deployments for all PRs
- Railway database branching for preview environments

### Known Patterns

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
