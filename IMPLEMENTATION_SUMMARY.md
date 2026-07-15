# 2026 Payments and Booking Implementation Snapshot

**Snapshot date:** July 15, 2026

This document describes the code in the modernization branch. It is not evidence that the branch,
schema, or provider configuration is deployed. Keep `PAYMENTS_ENABLED=false` until the separate
[rollout runbook](docs/modernization-rollout.md) is complete.

## Current deployment status

The earlier preview transaction in this repository was exercised against a pre-modernization
schema. It does not validate this branch. Read-only inventory currently shows:

- Railway `local`, `staging`, and `production` are missing core modernization tables, including the
  Checkout reservation bridge and durable webhook/identity inboxes. The dedicated guarded `test`
  environment now has the current schema; integration tests, data-backed Chromium smoke tests, and
  a clean second schema push passed there.
- Production contains 23 legacy Cal connection rows without the new `auth_mode` column; they must
  reconnect the same account before becoming bookable.
- Vercel Preview and Production are missing modern Cal OAuth/encryption configuration and
  `OAUTH_PROXY_SECRET`.
- `preview.discuno.com` redirects the Cal callback and webhook paths to Vercel SSO, so Cal.com
  cannot reach them.

Only Railway's dedicated guarded `test` schema was reset and updated while validating this branch.
No local, staging, or production database, provider configuration, or application deployment was
changed.

## Business policy encoded in the application

- The mentee pays the mentor's listed price plus applicable tax; Discuno adds no buyer service fee.
- Discuno retains a 15% mentor-side commission. The mentor share is 85% of the listed price.
- Stripe makes a platform charge. A separate mentor transfer becomes eligible after the scheduled
  session end plus 72 hours.
- Completed sessions, proven attendee no-shows, accepted sessions past their end, and proven late
  mentee cancellations may be paid.
- Mentor cancellation/no-show and mentee cancellation at least 24 hours before start receive a full
  refund. Refundable cancellations are explicitly payout-ineligible.
- A late cancellation pays only when an authenticated Cal read proves the canceller is the exact
  paying attendee. Unknown actors enter manual review; mentor cancellation refunds.
- Pending/successful refunds, `requires_action`, disputes, ambiguity, or manual review block or
  reverse transfers. `requires_action` is a hard hold.

## Server-authoritative Checkout and temporary slot hold

The booking action resolves the mentor, event type, price, currency, duration, connected account,
15% commission, and 85% payout on the server. Client values cannot author any financial field.
Mentor payout readiness requires the active `transfers` capability and payouts enabled.

Before a paid Checkout opens, Discuno:

1. Re-fetches Cal event compatibility and rejects unsupported authentication, required fields,
   recurrence, confirmation, pricing, seats, or location selection.
2. Requests a 45-minute Cal slot reservation.
3. Persists `discuno_checkout_slot_reservation`, binding the client attempt, mentor, event type,
   start/duration, reservation UID, exact Checkout request, generation, and Stripe Session.
4. Creates a 35-minute, card-only hosted Checkout with generation-scoped idempotency.

Retries re-attest and reuse their own active Session/hold. An exact request replay may roll to a new
generation only after Stripe definitively rejects its now-too-close `expires_at`; network, API,
generic validation, and idempotency ambiguity retain the original generation. A provider hold must
be proven durably bound locally before Stripe can open, and a known hold is released if that binding
cannot be established. The cancel route expires Stripe before releasing Cal; Checkout expiry,
payment failure, fulfillment success, and terminal fulfillment failure release or consume the hold.
Cleanup treats Stripe as authoritative when a row references a Session and keeps the mentor guard
until Stripe proves expiry or the exact payment row has taken ownership.

The Cal create-booking API does not atomically consume the reservation and supplies no Discuno
idempotency primitive, so the hold reduces Discuno-to-Discuno races but cannot guarantee against a
direct external Cal booking. Discuno durably records the first possible Cal POST before sending it.
After that boundary, retries reconcile only and never POST again; an unresolved negative provider
read becomes manual review instead of a duplicate booking or an unsafe refund. A definitive 4xx
provider rejection other than timeout resolves the marker; network, timeout, 5xx, and invalid
success responses retain it. Final authenticated booking reconciliation and the safe hold/refund
fallback remain authoritative.

Stripe Customers are bound to the Discuno user ID and are never recovered by matching email.
Durable anonymous-to-permanent identity links preserve customer and delayed-work attribution.

## Durable Stripe receipt and fulfillment

The platform and Connect endpoints verify Stripe signatures and persist privacy-minimal receipt
metadata in `discuno_stripe_webhook_inbox` before acknowledging. Inngest receives only the inbox
row ID. Its worker retrieves the authoritative Stripe event by event ID, processes it idempotently,
and marks or quarantines the receipt. Five-minute recovery requeues stranded work.

Paid fulfillment reconciles the PaymentIntent, charge, complete refund collection, disputes,
manual-review state, amount, currency, and immutable Checkout metadata under the payment lock before
creating a Cal booking. Provider hold, ambiguity, or event configuration drift fails closed.

If a Cal UID is known, recovery uses that exact authenticated GET. Only when the UID is genuinely
unknown may it perform a bounded cursor-paginated metadata scan. Attestation matches Cal UID/ID,
event type, current schedule, duration, payment ID, mentor, actor, paying attendee, and reschedule
lineage to Checkout. A database constraint permits only one current financially relevant booking
per payment. Exhausted/ambiguous recovery enters hold/refund handling rather than creating again.
Every terminal fulfillment path performs the same locked Cal reconciliation before refunding. A
recovered booking is persisted and, if the payment is held, cancelled; only provider-proven absence
without a prior create-attempt marker can reach automatic refund.

## Cal webhook trust and lifecycle

Each mentor connection gets an opaque webhook route and encrypted random signing secret. HMAC proves
tenant routing and notification delivery only; a mentor can manage that webhook, so it is never
financial authority. Paid booking binding, rejection/cancellation/no-show effects, and payout each
re-read Cal through the mentor's OAuth credentials and match the provider object to Checkout.

Signed payloads enter `discuno_calcom_webhook_inbox`; Inngest receives only the row ID. Invalid
contract payloads are immediately quarantined, scrubbed, fingerprinted by HTTP status/trigger, and
alerted. Transient failures retry before quarantine. The lifecycle ledger and atomic side-effect
leases preserve terminal events delivered out of order and stop duplicate financial effects.

Cal has no dedicated cancellation timestamp. Discuno immutably stores the earlier of authenticated
provider `updatedAt` and the signed envelope `createdAt`. Receipt time is never used, and a later
delivery cannot move the boundary toward mentor payout.

Current v2 webhook IDs are UUID strings. New subscriptions use supported triggers including
`MEETING_ENDED`; `BOOKING_COMPLETED` remains inbound legacy compatibility only.
Webhook provisioning and the six-hour connection audit page through the complete provider
`take`/`skip` inventory and fail closed at their safety bound.

## Financial ledgers and payout

`apps/web/src/lib/services/payment-service.ts` is the financial mutation boundary. Nested advisory
locks share one reserved PostgreSQL session, preventing payment/Checkout-to-token-refresh pool
deadlocks while retaining cross-process serialization.

- `discuno_payment` is the canonical snapshot and manual-review state.
- `discuno_payment_transfer` records every transfer generation and reversal.
- `discuno_payment_refund` records each refund and its evolving state.
- `discuno_payment_dispute` records active, lost, and released disputes.
- `discuno_calcom_booking_lifecycle` records tenant-owned terminal state and immutable first
  financial observation.

Immediately before transfer, the service reconciles the Stripe refund collection/transfer state and
performs an authenticated Cal GET. The hourly payout reconciliation job is recovery for missed
events or newly released holds; it does not replace those provider checks.

## Required Stripe platform webhook events

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

The separate Connect endpoint handles connected-account lifecycle/capability events. Keep platform
and Connect modes isolated; events delivered through the wrong endpoint are not financial evidence.

## Release and incident rules

Follow `docs/modernization-rollout.md`: back up and validate local/test/preview schemas first,
make the stable preview callback/webhook publicly reachable, configure separate approved Cal OAuth
clients, verify Inngest and every webhook, then exercise the complete test-mode booking/refund/
dispute/payout matrix. Production schema and deployment happen with `PAYMENTS_ENABLED=false`; paid
traffic is a later, explicit business decision.

During an incident, disable new Checkout, explicitly expire relevant open Stripe Sessions for a
hard charge freeze, and leave webhook processing active so in-flight refunds, disputes, reversals,
and completed payments reconcile safely. Never roll financial ledgers backward or bypass the
payment service.
