# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
│   │   │   ├── auth/      # NextAuth.js handlers
│   │   │   ├── webhooks/  # Cal.com & Stripe webhooks
│   │   │   └── cron/      # Scheduled tasks
│   │   └── types/         # Route-specific types
│   ├── components/
│   │   ├── ui/            # Base Radix UI primitives
│   │   └── shared/        # Shared business components
│   ├── server/            # Server-side code
│   │   ├── auth/          # NextAuth.js configuration
│   │   ├── db/            # Drizzle ORM schema & utils
│   │   ├── queries.ts     # Centralized database queries
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
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: NextAuth.js v5 with Drizzle adapter
- **Styling**: Tailwind CSS 4 + Radix UI primitives
- **Testing**: Vitest + Testing Library + jsdom
- **Type Safety**: TypeScript strict mode + Zod validation
- **Package Manager**: pnpm

### Database Architecture

#### Schema Organization (`apps/web/src/server/db/schema.ts`)

The database schema uses Drizzle ORM with snake*case naming convention and the `discuno*` table prefix.

**Core Tables**:

- `users`, `accounts`, `sessions`, `verification_tokens` - NextAuth.js tables
- `user_profiles`, `user_majors`, `user_schools` - User metadata with soft deletes
- `majors`, `schools` - Reference data
- `posts`, `mentor_reviews` - User-generated content
- `analytics_events` - User activity tracking for ranking algorithm

**Cal.com Integration**:

- `calcom_tokens` - OAuth tokens for Cal.com API
- `mentor_event_types` - Mentor's calendar availability & pricing
- `bookings` - Booking snapshots from Cal.com webhooks
- `booking_attendees`, `booking_organizers` - Normalized booking participants

**Stripe Integration**:

- `mentor_stripe_accounts` - Connected account information
- `payments` - Payment tracking with platform fee calculation
- Includes dispute period tracking and automatic transfer logic

**Important Patterns**:

- Soft deletes via `softDeleteTimestamps` helper (`deleted_at`, `created_at`, `updated_at`)
- Compound indexes for common query patterns
- Foreign keys with appropriate cascade/set null behavior
- JSON columns for flexible metadata storage

#### Database Queries

All database queries are centralized in `apps/web/src/server/queries.ts`. This file exports reusable query functions that encapsulate complex joins and business logic. Always use these functions rather than writing ad-hoc queries.

### Authentication Architecture

NextAuth.js v5 is configured in `apps/web/src/server/auth/`:

- **Providers**: Discord, Google, Microsoft Entra ID, Email (magic links)
- **Adapter**: Drizzle adapter for database sessions
- **Session Strategy**: Database sessions (not JWT)
- All auth logic must use the exported `auth()` function for server components
- Client components should use the NextAuth.js React hooks

### API Integration Patterns

#### Cal.com Integration (`apps/web/src/lib/calcom/`)

- OAuth 2.0 flow for managed users in Cal.com organization
- Token refresh logic with expiration handling
- Webhook handlers in `apps/web/src/app/api/webhooks/calcom/`
- All booking state stored locally with Cal.com IDs as foreign keys

#### Stripe Integration (`apps/web/src/lib/stripe/`)

- Stripe Connect for mentor payouts
- Checkout Session flow for bookings
- Webhook handlers in `apps/web/src/app/api/webhooks/stripe/`
- Payment lifecycle: pending → processing → succeeded → transferred
- Dispute period enforced before automatic transfers

#### PostHog Analytics

- Client-side tracking via `posthog-js`
- Server-side event capture via `posthog-node`
- Analytics events stored in database for ranking calculations

### Environment Variables

Environment variables are validated using `@t3-oss/env-nextjs` in `apps/web/src/env.js`. The validation runs at build time and provides type-safe access to environment variables.

**Required Variables**:

- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, provider credentials
- Database: `DATABASE_URL` (Neon PostgreSQL connection string)
- Cal.com: `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`, `CALCOM_*`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

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
- Neon database branching for preview environments

### Known Patterns

#### Server Actions

When using Server Actions in Next.js:

- Always validate inputs with Zod schemas
- Use `auth()` to get current user session
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
