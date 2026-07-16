# Modernization Rollout Runbook

This runbook describes how to release the current authentication, scheduling, payments, webhook,
analytics, and database-safety changes. The status ledger below distinguishes repository, database,
and deployment state; completing one does not imply that the later rollout stages are complete.

## Launch invariant

Keep `PAYMENTS_ENABLED=false` in every environment until its schema, secrets, webhooks, background
jobs, and end-to-end refund path have been verified. Do not enable paid Checkout in production as
part of the schema deployment.

## Current rollout status (verified July 16, 2026 ET)

### Completed away from production

- Railway `staging` was confirmed as the database backing the Vercel Preview environment. Before
  mutation it was backed up to
  `/tmp/discuno-staging-pre-modernization-20260715T124115Z.dump` (128,075 bytes), with SHA-256
  `8d1e34e02ba7fba31331f3464039cd6d2020d63a4816371dcdc6fae18a7853b8`; `pg_restore --list`
  successfully read the dump. This `/tmp` artifact is a local rollout artifact, not durable backup
  storage.
- The staging database's stale libc collation metadata was repaired safely: indexes were rebuilt
  with `REINDEX DATABASE CONCURRENTLY`, then the database collation version was refreshed. Its
  recorded and actual versions now both report `2.41`, with no invalid indexes.
- The reviewed modernization schema was applied to staging without truncating existing Cal.com
  data. Staging now has 28 application tables; its existing 59 users, 51 Cal.com connections, one
  booking, and one payment were preserved. A second `pnpm db:push:preview` reported no changes.
- Vercel Preview has the sensitive `DATABASE_URL`, `CALCOM_OAUTH_CLIENT_ID`,
  `CALCOM_OAUTH_CLIENT_SECRET`, `CALCOM_TOKEN_ENCRYPTION_KEY`, and `OAUTH_PROXY_SECRET` values. It
  also has the preview Cal.com API/app/callback/webhook URLs, Better Auth base/hub/trusted origins,
  `NEXT_PUBLIC_APP_URL`, `CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=false`, and
  `PAYMENTS_ENABLED=false`. The obsolete Preview variables `CALCOM_WEBHOOK_SECRET`,
  `COLLEGE_MENTOR_TEAM_ID`, `CALCOM_ORG_ID`, `X_CAL_SECRET_KEY`, `NEXT_PUBLIC_X_CAL_ID`, and
  `NEXT_PUBLIC_CALCOM_API_URL` were removed before the final redeploy.
- Preview's `BETTER_AUTH_PRODUCTION_URL` intentionally points to
  `https://preview.discuno.com`, which is the stable Better Auth OAuth callback/proxy hub for
  generated Vercel Preview hosts. Those hosts share the Preview-scoped `OAUTH_PROXY_SECRET`;
  Production has independent proxy state and does not participate in the Preview OAuth round trip.
- The Git-backed application deployment for mentor-access reconciliation commit `1d70bd5` is Ready
  as `dpl_27rbZWh8VLAeQTzRDamfoagmRid8` at
  `https://discuno-imykqvo8t-brad-mcnews-projects.vercel.app`. `preview.discuno.com` tracks the
  modernization branch and was verified against that immutable application deployment.
- Vercel project SSO Protection is disabled because Cal.com must reach the OAuth callback and
  webhook without an interactive Vercel login. On the Hobby plan this makes all preview and
  generated deployment URLs public; Discuno's own authentication and route authorization remain
  in effect. Reassess project-level protection if the hosting plan later supports a suitable public
  route exception.
- Public smoke checks returned the expected fail-safe responses: public pages returned `200`; the
  anonymous session endpoint returned `200` with a null session; unauthenticated Cal.com connect
  redirected safely to sign-in with `307`; a callback without state redirected with
  `invalid_state` and `307`; the legacy Cal.com POST returned `410`; a malformed route-scoped Cal.com
  webhook returned `400`; unsigned Stripe and Stripe Connect webhooks returned `400`; and unsigned
  cron and Inngest requests returned `401`.
- Remote Playwright smoke tests passed all three tests against `preview.discuno.com`. The read-only
  integration check passed for Better Auth, PostgreSQL, Cal.com configuration, Stripe, Upstash,
  Blob, Resend, PostHog, and Inngest; the database check confirmed 28 tables and 59 users. Google
  sign-in completed on the stable Preview hub, and live authorization probes confirmed that Google
  and Microsoft both receive the exact `preview.discuno.com` callbacks. A legacy verified school
  account with a null role was repaired without changing its existing school association; the
  deployed session-time reconciliation now handles that migration automatically. All 481 unit
  tests, 20 guarded database integration tests (including 12 concurrent mentor repairs), the
  production build, application and test type checks, lint, and formatting checks are green.
- The `Discuno Preview` confidential Cal.com OAuth client is approved with the required eight user
  scopes and exact `https://preview.discuno.com/api/integrations/calcom/callback` redirect URI. Its
  credentials are configured in Preview without exposing them to the repository.

### Still pending

- The first live mentor still needs to replace the existing legacy Platform connection through the
  approved Cal.com OAuth flow. After that user action, verify the encrypted OAuth row, synchronized
  event types, and per-connection route-scoped webhook before validating a free booking lifecycle.
- `PAYMENTS_ENABLED` remains `false`. No paid-provider lifecycle validation or launch decision has
  been made.
- Production database schema, deployment, and environment configuration are untouched. Two legacy
  Cal.com variables remain intentionally preserved in Production for the old production
  deployment. Production still contains legacy Cal.com connections that will require a deliberate
  same-account OAuth reconnection rollout after production is prepared.

Continue the remaining preview validation in the order below. Do not apply the production schema,
deploy this branch to production, or enable payments until the corresponding gates are explicitly
completed.

## 1. Prepare provider configuration

1. Create or approve separate confidential Cal.com OAuth clients for stable preview and production
   origins. Register the exact `/api/integrations/calcom/callback` URL for each environment.
2. Grant all required scopes: `PROFILE_READ`, `EVENT_TYPE_READ`, `BOOKING_READ`, `BOOKING_WRITE`,
   `SCHEDULE_READ`, `SCHEDULE_WRITE`, `WEBHOOK_READ`, and `WEBHOOK_WRITE`.
3. Configure the environment-specific Cal.com client ID, client secret, callback URL, and a random
   32-byte base64 token-encryption key. Configure Inngest signing/event keys as well.
4. Keep `CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=false` and leave the deprecated
   `CALCOM_WEBHOOK_SECRET` unset. It is required only if an explicitly approved rollback enables the
   legacy route; new route-scoped webhooks do not use it.
5. Confirm Stripe's platform and Connect webhook endpoints subscribe to the events listed in the
   web-app README. Server calls use the repository's `2026-06-24.dahlia` pin. New connected accounts
   request only the `transfers` capability and retain the hosted Express-style onboarding/dashboard
   experience. The platform endpoint must include `checkout.session.expired` so abandoned
   Checkout Sessions release their temporary Cal.com holds.

Never copy production secrets into preview or commit a pulled `.env*` file.

## 2. Validate the schema away from production

1. Back up the target database.
2. Provision a reset guard only for a dedicated local, test, or disposable preview database. See
   `apps/web/scripts/README.md`; there is intentionally no production reset guard.
3. Run `pnpm db:push:local`, inspect every statement, and run it again to prove the schema is clean.
4. Apply the same reviewed schema to Railway's dedicated test database and run guarded integration
   tests.
5. Apply the reviewed schema to preview before deploying the matching preview application. Run a
   second preview push to prove there is no remaining diff.

The schema includes durable Cal.com and Stripe webhook inboxes, Cal.com cleanup and booking
lifecycle records, payment ledgers, per-connection webhook credentials, the anonymous-user link
map, the Cal slot-reservation/Stripe Checkout bridge, reschedule/current-booking constraints, and
persistent analytics consent. Do not deploy application code that assumes these objects before the
schema exists.

## 3. Validate preview

Run the full repository checks and then use a real preview provider flow:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm typecheck:tests
pnpm test:coverage
pnpm build:web
pnpm integrations:check:preview
PLAYWRIGHT_BASE_URL=https://<stable-preview-host> pnpm test:e2e
pnpm audit --audit-level high
```

With `PAYMENTS_ENABLED=false`, verify:

- a mentor can authorize the approved Cal.com OAuth client and receives a ready connection only
  after event-type sync and a route-scoped webhook are provisioned;
- the provider webhook URL includes an opaque `connection` key, uses its own random signing secret,
  and rejects the shared route;
- a legacy Platform connection is shown as requiring reconnection;
- disconnect and account replacement are refused while the mentor owns active or financially
  unsettled bookings;
- free booking accepts the student's mobile number, preserves a supported single Cal.com location,
  and uses the event's current duration;
- incompatible or changed event configuration fails closed before a provider booking is created;
- Cal.com webhook inbox, lifecycle, cleanup, and five-minute recovery jobs process successfully;
- 15-minute incomplete-connection recovery and the six-hour paginated ready-connection audit repair
  intentionally drifted fixtures without truncating their scans, including more than one 250-row
  webhook page;
- anonymous checkout identity converts to a permanent account without losing booking, analytics,
  or delayed-payment attribution; and
- analytics opt-out persists while session replay remains disabled.

For paid-path validation, enable payments only in an isolated test/preview window. Exercise
reservation reuse, Checkout cancellation/expiry release, payment-failure release, successful
consumption, configuration-drift release/refund, reschedule lineage, exact-payer cancellation and
no-show attribution, dispute/manual-review behavior, and delayed mentor transfer. Disable payments
again after the test. Before Cal.com creation, fulfillment must retrieve and reconcile the
authoritative Stripe PaymentIntent, charge, refunds, and disputes. Before payout it must repeat
Stripe refund collection reconciliation and an authenticated Cal.com GET. Any hold, ambiguity,
identity mismatch, or configuration drift must prevent booking or transfer.

Also exercise the retry/crash boundaries directly: a provider hold must be read back and durably
bound before Stripe opens; a persisted Checkout request must replay with its original idempotency
key; only Stripe's explicit `expires_at` validation may roll it to a new generation; and an
ambiguous error must retain that generation. After the first possible Cal booking POST is marked,
a negative metadata scan must never send another POST or automatically refund. Every terminal
failure must perform locked provider reconciliation, recover/cancel any discovered future booking,
and route unresolved absence to manual review. Confirm cleanup does not release the mentor deletion
guard while either the Cal acquisition window or the referenced Stripe Session remains ambiguous.

## 4. Production release

1. Take and verify a production database backup.
2. Confirm all production environment values and provider webhook subscriptions without printing
   secrets.
3. Keep `PAYMENTS_ENABLED=false` and apply the exact schema diff already exercised in preview.
4. Deploy the matching application and verify authentication, `/api/inngest`, the protected cron
   routes, and read-only integration checks.
5. Invoke the protected `/api/cron/cleanup-auth` route until
   `scrubbedLegacyBookingWebhookPayloads` reports `0`. Each call scrubs at most 250 legacy full Cal.com
   booking payloads to a privacy-minimal audit marker; the daily cron remains an idempotent fallback.
6. Have existing mentors reconnect the same Cal.com account through settings. Legacy Platform rows
   are intentionally non-bookable, and switching to a different account remains blocked while any
   protected booking exists.
7. Monitor quarantined inbox/cleanup rows, manual-review payments, Inngest failures, Stripe webhook
   delivery, and Cal.com webhook delivery before considering the paid launch.
8. Enable `PAYMENTS_ENABLED=true` only as a separate, reversible business decision after the full
   production smoke test and support process are ready.

Do not remove old encryption/client-secret fallbacks until all stored values have rotated. Do not
enable the legacy shared Cal.com webhook route to bypass a failed per-connection migration; diagnose
and reprovision the affected connection instead.
