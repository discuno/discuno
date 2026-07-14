# Discuno Web App

Discuno connects students with verified college mentors for paid or free advice sessions. This is the production Next.js application behind [discuno.com](https://discuno.com).

## What it includes

- Better Auth with email OTP, Google, Microsoft, anonymous-to-user linking, and permission-based access control
- Cal.com organization users, mentor availability, event types, slots, bookings, and webhook synchronization
- Stripe Checkout plus Connect accounts for booking payments and mentor payouts
- Durable booking fulfillment and retries through Inngest
- PostgreSQL on Railway with Drizzle ORM
- PostHog analytics, Sentry monitoring, Resend email, Upstash rate limiting, and Vercel Blob storage

## Stack

| Area       | Technology                                                   |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16, React 19, Turbopack, Cache Components            |
| Language   | TypeScript 5.9 in strict mode                                |
| UI         | Tailwind CSS 4, Radix UI                                     |
| Data       | PostgreSQL, Drizzle ORM, Zod                                 |
| Auth       | Better Auth 1.6                                              |
| Scheduling | Cal.com API v2 organization APIs                             |
| Payments   | Stripe Checkout and Connect                                  |
| Tests      | Vitest 4, Testing Library, guarded Railway integration tests |

## Local setup

From the repository root:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Fill in apps/web/.env.local, or pull the linked Vercel development environment.
cd apps/web && vercel env pull .env.local && cd ../..
pnpm db:push:local
pnpm dev:web
```

Requirements are Node.js 24, pnpm 11+, and access to the linked development services. Environment variables are validated in `src/env.js`; `.env.example` is the canonical inventory.

## Quality checks

Run these from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build:web
pnpm audit
pnpm integrations:check:local
```

Unit tests never reset a database. Database integration tests must use Railway's dedicated guarded `test` environment:

```bash
railway run --environment test --service Postgres zsh -c \
  'export DATABASE_URL="$DATABASE_PUBLIC_URL"; pnpm test:integration'
```

The integration reset refuses to run unless `_discuno_test_environment_guard` contains the expected marker.

## Database workflow

This repository uses reviewed Drizzle schema pushes rather than generated migration files:

```bash
pnpm db:push:local
pnpm db:push:preview
pnpm db:push:prod
```

Always inspect the interactive SQL diff. Validate locally first, run it again to confirm there is no remaining diff, and coordinate shared-environment changes with the matching application deployment.

Normal seeding is database-only. Creating or deleting external Cal.com and Stripe test accounts requires explicit opt-in environment flags; Stripe cleanup also refuses live-mode keys.

## Integration notes

### Cal.com

- Platform credentials authenticate organization-user and team APIs; per-user OAuth refresh tokens are no longer used.
- API versions are centralized in `src/lib/calcom/client.ts`.
- The production webhook is `/api/webhooks/cal` and must use `CALCOM_WEBHOOK_SECRET`.

### Stripe

- The server API version is pinned in `src/lib/stripe/index.ts`.
- New connected accounts use controller properties equivalent to the Express configuration.
- `/api/webhooks/stripe` handles both immediate and delayed Checkout success events.
- `/api/webhooks/stripe-connect` tracks connected-account capability and restriction changes.

### Deployment

Vercel hosts the application and Railway hosts PostgreSQL. Preview and production environments have separate pulled env files locally. Never commit `.env*` credentials or webhook signing secrets.

## Project layout

```text
src/
├── app/                 App Router pages, Server Actions, API routes, webhooks
├── components/          Shared and Radix-based UI components
├── inngest/             Durable background functions
├── lib/                 Auth, Cal.com, Stripe, email, analytics, and utilities
└── server/              Drizzle schema, DAL, protected queries, ranking, tests
scripts/                 Guarded database push/reset/seed utilities
```

See the [main README](../../README.md), [contributing guide](../../CONTRIBUTING.md), and [security policy](../../SECURITY.md) for repository-wide guidance.
