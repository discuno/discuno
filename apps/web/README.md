# Discuno Web App

Discuno helps students talk through a specific college decision with someone who has relevant
firsthand context. This is the Next.js application behind [discuno.com](https://discuno.com).

## What it includes

- Better Auth with email OTP, Google, Microsoft, durable anonymous-to-user identity linking, and permission-based access control
- Cal.com standard OAuth, mentor availability, event types, slots, bookings, and durable webhook synchronization
- Stripe Checkout plus Connect accounts for booking payments and mentor payouts
- Durable booking fulfillment and retries through Inngest
- PostgreSQL on Railway with Drizzle ORM
- Consent-gated PostHog analytics (session replay disabled), Resend email, Upstash rate limiting, and Vercel Blob storage

## Stack

| Area       | Technology                                                   |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16, React 19, Turbopack, Cache Components            |
| Language   | TypeScript 6 in strict mode                                  |
| UI         | Tailwind CSS 4, shadcn/ui Base UI                            |
| Data       | PostgreSQL, Drizzle ORM, Zod                                 |
| Auth       | Better Auth 1.6                                              |
| Scheduling | Cal.com API v2 with per-mentor confidential OAuth            |
| Payments   | Stripe Checkout and Connect                                  |
| Tests      | Vitest 4, Testing Library, Playwright, guarded Railway tests |

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
pnpm typecheck:tests
pnpm test:coverage
pnpm test:e2e
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
Provision the guard once with `pnpm db:guard:test`; the command prints the exact
database-name confirmation it requires. See [the database scripts guide](scripts/README.md).

## Database workflow

This repository uses reviewed Drizzle schema pushes rather than generated migration files:

```bash
pnpm db:push:local
pnpm db:push:preview
pnpm db:push:prod
```

Always inspect the interactive SQL diff. Validate locally first, run it again to confirm there is no remaining diff, and coordinate shared-environment changes with the matching application deployment.

Normal seeding is database-only. Optional reset cleanup can delete only platform-owned Stripe test accounts and refuses live-mode keys; mentor-owned Cal.com accounts are never deleted.

## Integration notes

### Cal.com

- Mentors connect the Cal.com account they already use through standard confidential OAuth.
- Access and refresh tokens are encrypted at rest, refreshed server-side, and require
  `PROFILE_READ`, `EVENT_TYPE_READ`, `BOOKING_READ`, `BOOKING_WRITE`, `SCHEDULE_READ`,
  `SCHEDULE_WRITE`, `WEBHOOK_READ`, and `WEBHOOK_WRITE`.
- Legacy Platform connections remain inert until the mentor reconnects; database resets never delete mentor-owned Cal.com accounts.
- A mentor cannot disconnect or switch to a different Cal.com account while active or financially unsettled bookings still depend on the current account. Reconnecting the same account remains the migration path.
- Every connection receives an encrypted random webhook route key and signing secret. The webhook handler resolves the opaque `connection` route, verifies the connection-specific signature, and binds organizer/mentor claims to that tenant before persistence. `CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS` must remain `false`.
- That HMAC is tenant routing/delivery evidence, not financial evidence. Paid binding, cancellation/no-show effects, and payout re-read the booking through mentor OAuth and attest it to the immutable Checkout snapshot.
- Signed webhooks enter a deduplicated PostgreSQL inbox before Inngest processes them; queued events contain only an inbox row ID and stored payloads are scrubbed after processing. Durable lifecycle, cleanup-outbox, and five-minute recovery jobs protect out-of-order delivery and queue outages.
- API versions are centralized in `src/lib/calcom/client.ts`: booking writes/reads `2026-02-25`, booking lists `2026-05-01`, event types `2024-06-14`, schedules `2024-06-11`, and slots `2024-09-04`.
- Provisioned webhook IDs are UUID strings and current subscriptions use `MEETING_ENDED`; `BOOKING_COMPLETED` remains accepted only for legacy inbound compatibility.
- Booking fails closed when Cal.com requires unsupported authentication, fields, recurrence, confirmation, pricing, seats, or location selection. The form supplies a normalized mobile number; the server forwards one supported provider location and revalidates compatibility and duration immediately before creating the booking.
- Paid Checkout creates a 45-minute Cal.com slot hold before a 35-minute card-only Stripe Session and stores their durable attempt bridge. The hold narrows concurrent Discuno races but is not atomic with final Cal.com booking creation, so fulfillment still re-reads Cal.com and refunds/holds safely on conflict.

See [Cal.com OAuth and scheduling operations](../../docs/calcom-oauth.md) for provider setup and the
reconnection procedure.

### Stripe

- The server API version is pinned to `2026-06-24.dahlia` in `src/lib/stripe/index.ts`.
- New connected accounts use controller properties equivalent to the Express configuration and request only the `transfers` capability needed for separate transfers.
- Paid sessions use a platform charge with no buyer service fee. Discuno retains a 15% mentor-side commission, and the separate 85% mentor transfer becomes eligible 72 hours after the scheduled session ends.
- Mentor cancellations, mentor no-shows, and mentee cancellations at least 24 hours before the session start receive a full refund and set `mentor_payout_eligible` false.
- A mentee cancellation less than 24 hours before the start is non-refundable and sets `mentor_payout_eligible` true, keeping the 85% mentor transfer eligible after the scheduled end plus 72 hours. An OAuth-authenticated provider read confirms status and actor; the stored first conservative cancellation observation controls the boundary.
- A Stripe refund in `requires_action` hard-holds payout, reverses any existing mentor transfer, and requires manual review until safely resolved.
- Immediately before a paid Cal.com booking is created, fulfillment retrieves the authoritative PaymentIntent, charge, refunds, and disputes under the payment lock. Any provider hold, ambiguous pagination/state, manual-review flag, or event configuration drift prevents booking creation and enters the safe hold/refund path.
- Once a Cal UID is known, reconciliation uses its exact authenticated GET. Bounded metadata pagination is allowed only while the UID is genuinely unknown; UID/ID, event type, current schedule, duration, payment, mentor, actor, payer, and reschedule lineage must match, and only one current booking may bind a payment.
- `/api/webhooks/stripe` handles Checkout, refund, dispute, and later payment-failure state. Its platform webhook subscription must include all of the following events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `refund.created`
  - `refund.updated`
  - `refund.failed`
  - `charge.dispute.created`
  - `charge.dispute.updated`
  - `charge.dispute.closed`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `charge.failed`
- `/api/webhooks/stripe-connect` tracks connected-account capability and restriction changes.

### Deployment

Vercel hosts the application and Railway hosts PostgreSQL. Preview and production environments have separate pulled env files locally. Never commit `.env*` credentials or webhook signing secrets.
Keep `PAYMENTS_ENABLED=false` through the schema and application rollout. Apply the reviewed schema
to test and preview first, verify the full preview lifecycle, and treat enabling production payments
as a separate decision. Follow the [modernization rollout runbook](../../docs/modernization-rollout.md);
the repository does not imply that its current worktree has been deployed.

## Project layout

```text
src/
├── app/                 App Router pages, Server Actions, API routes, webhooks
├── components/          Shared and shadcn Base UI components
├── inngest/             Durable background functions
├── lib/                 Auth, Cal.com, Stripe, email, analytics, and utilities
└── server/              Drizzle schema, DAL, protected queries, ranking, tests
scripts/                 Guarded database push/reset/seed utilities
```

See the [main README](../../README.md), [contributing guide](../../CONTRIBUTING.md), and [security policy](../../SECURITY.md) for repository-wide guidance.
