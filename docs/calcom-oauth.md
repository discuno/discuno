# Cal.com OAuth and Scheduling Operations

Discuno uses Cal.com's standard confidential OAuth flow. Each mentor connects a Cal.com account
they own; Discuno does not create or delete managed Platform users.

## Create the OAuth client

1. Open [Cal.com Developer OAuth](https://app.cal.com/settings/developer/oauth) and create a
   confidential OAuth client.
2. Enable every scope used by the current booking flow:

   - `PROFILE_READ`
   - `EVENT_TYPE_READ`
   - `BOOKING_READ`
   - `BOOKING_WRITE`
   - `SCHEDULE_READ`
   - `SCHEDULE_WRITE`
   - `WEBHOOK_READ`
   - `WEBHOOK_WRITE`

3. Register exact callback URLs. Typical values are:

   - Local: `http://localhost:3000/api/integrations/calcom/callback`
   - Preview: `https://preview.discuno.com/api/integrations/calcom/callback`
   - Production: `https://discuno.com/api/integrations/calcom/callback`

4. Submit the client for Cal.com approval. A pending client cannot authorize mentors.

Cal.com permits a limited number of redirect URIs, so do not register every ephemeral Vercel URL.
Use a publicly provider-reachable stable preview alias and a separate production client. Cal.com
cannot traverse Vercel Deployment Protection/SSO. OAuth must also begin on that same stable preview
origin because the short-lived state cookie is host-only.

## API contracts

All Cal.com calls use API v2 and declare endpoint-specific versions in
`apps/web/src/lib/calcom/client.ts`:

| Contract                  | `cal-api-version` |
| ------------------------- | ----------------- |
| Create/get/cancel booking | `2026-02-25`      |
| List bookings             | `2026-05-01`      |
| Event types               | `2024-06-14`      |
| Schedules                 | `2024-06-11`      |
| Slots                     | `2024-09-04`      |

Do not replace these with one global header. Cal.com versions contracts by endpoint. When upgrading,
read the current contract for every affected endpoint, update schemas and tests, and keep the
version pin next to the request.

Webhook create/update payloads separately use Cal.com's webhook payload version `2021-10-20`.
Treat returned webhook IDs as opaque strings: current v2 IDs are UUIDs, while numeric historical
IDs are accepted only for cleanup and normalized to strings. New connections provision exactly the
current supported trigger set:

- `BOOKING_CREATED`
- `BOOKING_REJECTED`
- `BOOKING_RESCHEDULED`
- `BOOKING_CANCELLED`
- `BOOKING_NO_SHOW_UPDATED`
- `MEETING_STARTED`
- `MEETING_ENDED`
- `AFTER_HOSTS_CAL_VIDEO_NO_SHOW`
- `AFTER_GUESTS_CAL_VIDEO_NO_SHOW`

`BOOKING_COMPLETED` is accepted by the inbound handler only for legacy compatibility; current
create-webhook does not support provisioning it.

Booking reconciliation uses Cal.com's current cursor pagination with a limit of 100 and a bounded
multi-page scan. It fails closed on an invalid cursor or an exhausted scan so a retry cannot create
a duplicate beyond the inspected pages.

Webhook reconciliation follows the separate `take`/`skip` contract, requests the maximum 250 rows
per page, and scans every page up to a hard 100-page safety bound. Connection setup and the periodic
audit both fail closed if a complete provider inventory cannot be proven; they never deduplicate or
delete against a truncated first page.

## Configure an environment

Set the following server-only variables independently in local, preview, and production:

```dotenv
CALCOM_API_URL=https://api.cal.com/v2
CALCOM_APP_URL=https://app.cal.com
CALCOM_OAUTH_CLIENT_ID=
CALCOM_OAUTH_CLIENT_SECRET=
CALCOM_OAUTH_REDIRECT_URI=
CALCOM_TOKEN_ENCRYPTION_KEY=
CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=false
# CALCOM_WEBHOOK_SECRET=
```

The token encryption key must be exactly 32 random bytes encoded as base64:

```bash
openssl rand -base64 32
```

`CALCOM_WEBHOOK_URL` is optional and defaults to
`NEXT_PUBLIC_BASE_URL/api/webhooks/cal`. Set it only when the environment uses a stable public
webhook hostname that differs from its app URL.
The URL must be publicly reachable by Cal.com and must not sit behind Vercel Deployment Protection.

`CALCOM_WEBHOOK_SECRET` is an optional rollback/migration value for webhooks created before
route-scoped secrets. New connections do not use it. Keep
`CALCOM_ALLOW_LEGACY_SHARED_WEBHOOKS=false` and leave the shared secret unset; an unscoped webhook
request then receives `410`. Enabling the legacy switch without the secret fails environment
validation. Do not enable the legacy path to work around a broken connection.

## Connection and webhook flow

- `/settings/calendar` sends a signed-in mentor through Cal.com's authorization screen with a
  random, short-lived CSRF state value.
- The callback verifies the mentor, the complete granted-scope set, and `/me` identity before
  storing AES-256-GCM-encrypted access and refresh tokens.
- Access tokens refresh server-side under a per-user PostgreSQL advisory lock. A Cal.com request
  retries once after a `401` using a forced refresh.
- Connection setup synchronizes event types and provisions exactly one account-level booking
  webhook before the connection is considered ready.
- Every connection receives a random opaque route key and random signing secret. Both are encrypted
  at rest; only a hash of the route key is queried. The subscriber URL carries
  `?connection=<opaque-key>`, and each request is bound to the expected Discuno and Cal.com identity
  before it enters the inbox.
- Signed payloads are deduplicated in PostgreSQL before Inngest receives an inbox row ID. Raw payload
  data is scrubbed after processing. Five-minute recovery jobs requeue stranded inbox and webhook
  cleanup work; invalid contract payloads are quarantined and alerted immediately, while repeated
  transient failures are quarantined for review.
- A 15-minute recovery repairs incomplete connection setup. A six-hour, cursor-paginated audit
  verifies every ready connection and reprovisions drifted webhooks; it fails closed rather than
  silently truncating an oversized scan.
- Disconnect or account replacement first records old-provider webhook cleanup in a durable outbox.
  Cleanup credentials are retained only for that task and are scrubbed after completion.

Legacy `legacy_platform` rows are intentionally non-bookable. Existing mentors must reconnect once
through `/settings/calendar`; old credentials are never converted or reused. Reconnecting the same
account is the migration path. Disconnecting or switching to a different Cal.com account is refused
while the mentor has a pending/accepted booking, an unsettled payment, or a payment under manual
review. This protects the webhook and calendar identity needed to finish those bookings.

## Booking compatibility

Discuno owns Checkout and therefore rejects Cal.com event types that cannot be fulfilled safely by
its custom booking form. The gate currently rejects required Cal.com authentication or email
verification, recurrence, confirmation, instant or seated events, Cal-managed pricing, multiple or
student-supplied locations, and unsupported required booking fields.

The student supplies a normalized international mobile number. When an event has one supported
provider-defined location, Discuno forwards that current location object. For paid bookings the
server snapshots the duration at Checkout, re-fetches compatibility and duration immediately before
the Cal.com POST, passes `lengthInMinutes`, and validates the returned start/end/duration. A change or
ambiguous state fails closed and triggers the payment hold/refund path instead of creating an unsafe
booking.

Before opening paid Checkout, Discuno requests a 45-minute Cal.com slot reservation and persists a
bridge between the booking-attempt ID, reservation UID, and 35-minute card-only Stripe Session.
The bridge also stores the exact generation-scoped Checkout request and idempotency key. Before
creating or replaying Stripe, Discuno re-reads the exact provider reservation. A stale Checkout
snapshot rolls to a new reservation/generation only after Stripe explicitly rejects `expires_at` as
too close; timeouts, API failures, generic validation errors, and idempotency conflicts remain
fail-closed. Cancellation expires Stripe before releasing the Cal hold; Checkout expiry, payment
failure, fulfillment success, and terminal fulfillment failure also release or consume it. Daily
cleanup keeps the mentor guard while Stripe is ambiguous and clears it only after the exact payment
has taken over the row or Stripe proves the Session expired.

Cal's final create-booking API does not atomically consume that reservation and exposes no Discuno
idempotency key, so the hold is a race-reduction mechanism—not a promise that an external Cal
booking cannot conflict. Immediately before the first booking POST, Discuno durably marks the
payment as having crossed the provider-mutation boundary. Once that marker exists, every retry is
reconciliation-only: a negative list result never authorizes another POST. Provider absence remains
ambiguous and enters manual review rather than risking either a duplicate booking or a refund for a
booking that may still appear. A definitive Cal.com 4xx rejection other than request timeout
durably resolves the marker because no booking was accepted; timeout, network, 5xx, and malformed
success responses retain it. Authenticated final creation/reconciliation and the safe hold/refund
fallback remain authoritative.

Free and paid attempts carry unique Discuno metadata. If the canonical Cal UID is known, recovery
uses that exact authenticated GET. Only while the UID is genuinely unknown may it perform a bounded,
cursor-paginated metadata search. Paid attestation matches the Cal UID/ID, event type, current
schedule, duration, payment ID, mentor identity, actor ID, paying attendee, and verified reschedule
lineage to the immutable Checkout snapshot. A matching terminal booking, ambiguous page scan, or
conflicting state is an error, not permission to create another booking. A database constraint
permits only one current financially relevant booking per payment.

Every terminal Checkout path reconciles Cal.com while holding the payment lock before it can issue
a refund. A recovered future booking is persisted and, when the payment is held, cancelled through
the mentor's OAuth connection. Only provider-proven absence with no prior mutation marker permits an
automatic refund; lookup failures and eventual-consistency ambiguity require manual review.

The booking lifecycle ledger accepts out-of-order terminal webhooks without losing cancellation or
no-show state. Tenant ownership and atomic side-effect leases ensure a duplicate delivery cannot run
financial effects twice. A tenant-scoped HMAC proves notification origin/routing, not financial
truth, because a mentor controls their own webhook configuration. Before paid binding,
cancellation/rejection/no-show effects, or payout, Discuno re-reads the booking with that mentor's
OAuth token and verifies it against Checkout. For cancellation, the ledger immutably preserves the
earlier of authenticated provider `updatedAt` and signed-envelope `createdAt`; it never uses receipt
time or lets a later delivery move the boundary toward a mentor payout. Late payout additionally
requires the provider-confirmed canceller to be the exact paying attendee.

## Rotation

For a Cal client-secret rotation, put the old value in
`CALCOM_OAUTH_CLIENT_SECRET_FALLBACK`, deploy the new primary secret, wait for in-flight callbacks
and refreshes to settle, then remove the fallback.

For a token-encryption-key rotation, move the old key to
`CALCOM_TOKEN_ENCRYPTION_KEY_PREVIOUS` and deploy a new primary key. Credentials are rewritten with
the primary key as tokens refresh, but a token refresh alone does not prove that stored webhook
route/secret values or pending cleanup credentials have been rewritten. Keep the previous key until
an audited rotation confirms every encrypted Cal.com field uses the primary key and the old-key
cleanup outbox is empty. Removing it earlier makes affected connections unreadable.

## Verification

Run the read-only connectivity check for the target environment, then complete one real mentor flow:

```bash
pnpm integrations:check:preview
```

Verify that the mentor can connect, see only compatible event types enabled, edit availability, load
slots, create and cancel a test booking, receive a route-scoped webhook update, and reconnect the
same account. Verify that account replacement is blocked when protected bookings exist. Keep
`PAYMENTS_ENABLED=false` until the complete preview booking, refund, dispute, and delayed-transfer
path has passed. Follow the [modernization rollout runbook](modernization-rollout.md).

## Official references

- [Cal.com API v2 introduction](https://cal.com/docs/api-reference/v2/introduction)
- [Cal.com standard OAuth](https://cal.com/docs/api-reference/v2/oauth)
- [Cal.com create booking](https://cal.com/docs/api-reference/v2/bookings/create-a-booking)
- [Cal.com list bookings](https://cal.com/docs/api-reference/v2/bookings/get-all-bookings)
- [Cal.com reserve slot](https://cal.com/docs/api-reference/v2/slots/reserve-a-slot)
- [Cal.com delete reserved slot](https://cal.com/docs/api-reference/v2/slots/delete-a-reserved-slot)
- [Cal.com webhooks](https://cal.com/docs/api-reference/v2/webhooks/create-a-webhook)
