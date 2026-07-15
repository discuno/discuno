# 2026 Payments and Booking Implementation Snapshot

**Snapshot date:** July 14, 2026

This document describes the payment and booking architecture implemented in the current branch. It is not a production-readiness certificate: the controlled Stripe test-mode matrix, operational alert delivery, and the production backup/schema/deployment gates must still be completed before the flow is promoted to production.

Current branch verification on July 14, 2026:

- Type checking, linting, formatting, all 115 unit tests across 19 files, and the Next.js production build pass. The build emits 41 application routes.
- The guarded Railway test database suite passes, the preview schema is applied, and a second preview schema push reports no changes.
- All eight preview integration configuration checks pass. Signed Stripe platform, Stripe Connect, and Cal.com preview webhook smokes return success on both the immutable deployment URL and `preview.discuno.com`.
- The official Inngest Vercel integration is connected to Preview with fresh managed keys. The route exposes four product functions and six Cloud-visible configurations after the two generated failure handlers. `verify-inngest-invocation` completed successfully in the Preview branch environment and reported only the expected environment and commit metadata. The real `process-checkout-side-effects` business function also ran through its production handler during the controlled paid booking below.
- One controlled Stripe test-mode transaction completed Checkout → signed Stripe webhook → payment ledger → Inngest → PostHog → Cal.com → signed Cal webhook with exactly one payment and one linked booking. The $5.00 session produced $0.33 of test tax and a $5.33 platform charge. This proves the core immediate-payment path, not the entire delayed-payment/payout/dispute matrix.
- The same booking was cancelled more than 24 hours before start using Cal.com's authoritative cancellation time. The signed cancellation path produced exactly one successful $5.33 Stripe refund and one refund ledger row, left zero transfers, kept the booking payout-ineligible, and required no manual review.
- The exercise exposed two Cal.com contract changes. The live fixture required Cal email verification, which Discuno's backend checkout cannot supply, and API cancellations return a blank actor email. Event compatibility is now checked before Checkout and again immediately before Cal creation; blank/unknown cancellation actors are handled without guessing, and unsafe late cases create a locked manual-review hold that reverses any active transfer.

## Business policy encoded in the application

- The mentee pays the mentor's listed session price plus applicable tax. Discuno adds no buyer service fee.
- Discuno retains a 15% mentor-side commission; the mentor share is 85% of the listed price.
- Stripe Checkout creates a platform charge. It does not create an immediate destination transfer.
- The mentor transfer becomes eligible after the scheduled session end plus 72 hours for a completed session, an attendee no-show, an otherwise accepted booking that reached its end, or a late mentee cancellation explicitly marked payout-eligible.
- Mentor cancellations and mentor no-shows receive a full refund. Mentee cancellations at least 24 hours before the start receive a full refund and set payout eligibility false.
- A mentee cancellation less than 24 hours before the start is non-refundable and sets payout eligibility true, preserving the mentor's 85% transfer after the normal scheduled-end-plus-72-hour window. The Cal cancellation event envelope's `createdAt` determines this inclusive 24-hour boundary.
- Refunds, disputes, administrative holds, and manual-review state block automatic mentor transfers. A Stripe refund in `requires_action` is a hard hold that reverses any existing transfer and requires manual review.

The reusable policy calculations live in `apps/web/src/lib/stripe/marketplace.ts`.

## Paid Checkout

The booking action at `apps/web/src/app/(app)/(public)/mentor/[username]/book/actions.ts` treats the server as the source of truth:

1. It validates the requested mentor username, event type, start time, and attendee details.
2. It resolves the mentor, Cal.com event type, listed price, currency, duration, and Stripe connected account from stored data.
3. It rejects Cal.com event types that require Cal email verification/authentication, recurrence, manual confirmation, or a required field the custom checkout does not supply.
4. It verifies the mentor's Stripe account is active and supports both charges and payouts.
5. It calculates the 15% commission and 85% mentor share on the server.
6. It creates a Stripe Checkout Session for a platform charge, using a deterministic booking-attempt idempotency key and transfer group.

The client does not author price, currency, fee, payout amount, or connected-account values. Checkout metadata is schema-validated again during fulfillment, including arithmetic checks against the session amount.

Each authenticated or anonymous Discuno user can have a `stripe_customer_id` on `discuno_user`. `apps/web/src/lib/stripe/customer.ts` creates or reuses that user-bound customer and does not search for an existing Stripe Customer by email. Anonymous-to-permanent account linking migrates the binding when appropriate.

## Durable fulfillment and Cal.com booking reconciliation

The Stripe webhook at `apps/web/src/app/api/webhooks/stripe/route.ts` accepts paid Checkout completion, including delayed-payment success, and persists the canonical payment before queuing `stripe/checkout.completed`.

`process-checkout-side-effects` in `apps/web/src/inngest/functions.ts` performs the Cal.com booking work as retryable steps. Paid Cal.com creates include the Discuno payment ID in booking metadata. Before a retry sends another create request, `findCalcomBookingByPaymentId` queries recent bookings by attendee and event type and returns an existing metadata match. This is the recovery mechanism for an ambiguous Cal.com create response.

Immediately before any new Cal booking POST, the integration checks compatibility again. This closes the Checkout-to-fulfillment settings window: a newly incompatible event fails into the existing retry/reconciliation/refund workflow rather than creating an unsafe pending booking. Cal's authoritative `PENDING` state is also preserved locally instead of being promoted to `ACCEPTED`.

If checkout fulfillment exhausts its retries, the failure handler waits briefly and checks the payment and local booking state written by the Cal.com webhook or prior steps. Each attempted create already reconciled Cal.com before sending another request. The failure handler preserves a booking it can identify; otherwise it requests a payment refund and sends the failure notification. An unsuccessful refund is alerted for operational attention and returned as unsuccessful.

Cal.com webhooks validate organizer, mentor, attendee, event-type, and payment relationships before binding paid booking state locally. For `BOOKING_CANCELLED`, the handler uses the signed event envelope's `createdAt` rather than webhook delivery time. Early cancellations refund regardless of actor attribution. A late cancellation pays the mentor only when the actor is proven to be an attendee; hosts refund, while a blank or unknown actor creates a durable manual-review hold. That hold uses the payment lock and reverses any active transfer before the webhook is acknowledged.

Free bookings do not enter the Stripe flow. Their public booking action is protected by separate actor and IP rate limits, and a deterministic attempt ID is reconciled against Cal.com metadata before a retry creates another booking.

## Payment state and ledgers

`apps/web/src/server/db/schema/payment.ts` defines one current payment snapshot plus normalized Stripe object history:

- `discuno_payment` stores the canonical Checkout/PaymentIntent/charge references, mentor and amount snapshot, Cal.com booking UID, latest transfer and refund state, eligibility date, and manual-review flags.
- `discuno_booking.mentor_payout_eligible` is false by default and is set true only when a late mentee cancellation remains payable; refundable cancellations explicitly keep it false.
- `discuno_payment_transfer` stores each Stripe transfer generation and any reversal.
- `discuno_payment_refund` stores every Stripe refund, including partial or repeated refunds.
- `discuno_payment_dispute` stores every Stripe dispute and its reconciled active, lost, or released state.

The ledger tables are required for auditability and for handling multiple Stripe objects against one charge. Do not replace them with only the latest IDs on `discuno_payment`.

## Transfers, refunds, and disputes

`apps/web/src/lib/services/payment-service.ts` is the financial mutation boundary.

- A PostgreSQL advisory transaction lock serializes operations for one payment.
- Before creating a transfer, the service reconciles Stripe transfers using the transfer group, payment metadata, destination account, source charge, amount, and currency. This remains effective after Stripe's idempotency-key retention window.
- A mentor transfer uses the platform charge as its source transaction and sends the stored 85% mentor amount. Transfer generations permit a valid payout to be recreated after a prior transfer was reversed.
- Refund processing reconciles Stripe's charge/refund state and records each refund in the refund ledger.
- Pending and `requires_action` refunds prevent payout and reverse any existing mentor transfer. `requires_action` additionally marks the payment for manual review until the refund is safely resolved.
- An active or lost dispute holds the payment and reverses any remaining mentor transfer. When every dispute is released, an otherwise eligible payout can be queued again.
- Failed reversals, ambiguous partial-refund situations, or other unsafe states mark the payment for manual review and prevent automatic transfer.
- An unclassified late cancellation acquires the same payment lock as transfer creation, reverses or reconciles an existing transfer, and then marks the payment for manual review with a one-time admin alert.

Call this payment service from booking, webhook, or administrative flows. Bypassing it would also bypass locking, Stripe reconciliation, ledgers, and common idempotency behavior.

## Payout recovery

There are two payout paths in `apps/web/src/inngest/functions.ts`:

- `process-mentor-payout` handles event-driven payout scheduling and retries.
- `reconcile-eligible-mentor-payouts` runs hourly at minute 15 and queues up to 100 due payments that meet all transfer conditions.

The hourly function is the safety net for a missed Cal.com webhook, missed Inngest event, delayed eligibility, or a payout released after dispute resolution. It is not a substitute for the payment service's Stripe-side reconciliation.

## Stripe webhook events required

The platform Stripe webhook must subscribe to:

- `checkout.session.completed`
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

The Stripe Connect webhook remains separately configured for connected-account lifecycle events used by mentor onboarding.

## Verification status and remaining release work

Targeted unit coverage exists for the real Checkout webhook handler, marketplace calculations, Cal compatibility and cancellation actor policy, Stripe refund/reversal/locked-hold behavior, Cal.com schemas, mentor cancellation authorization, and the side-effect-free Inngest operational probe. The former `checkout-inngest.test.ts` was removed because it exercised standalone mocks rather than production code. The broader paid-booking matrix must still prove delayed and post-service financial cases.

Completed Preview gates:

1. Lint, type checking, unit tests, the production build, and the guarded database integration suite pass.
2. The new nullable payment columns, `stripe_customer_id`, `mentor_payout_eligible`, and the three ledger tables are applied to Preview; a second schema diff is empty.
3. The Preview Stripe webhooks contain every required event above and their signed smokes succeed.
4. The Cal.com webhook triggers and signing secret match the current versioned payloads, and the local Cal.com MCP connection passes an authenticated read.
5. The official Inngest Vercel integration is connected to Preview, stale Preview keys are rotated, all six Cloud-visible configurations are registered, authenticated route inspection succeeds through Deployment Protection, and the operational smoke completed with the expected Preview environment/commit metadata.
6. A controlled $5.33 Stripe test-mode charge completed the immediate paid-booking path through the real Stripe webhook, payment ledger, Inngest business function, PostHog, Cal.com create/reconciliation, signed Cal webhook, and exactly one linked local booking. No duplicate charge, booking, refund, or transfer was created during retry recovery.
7. The controlled early-cancellation path completed through the real Cal handler and payment service: one full $5.33 refund, one refund ledger entry, zero transfers, `mentor_payout_eligible=false`, and matching refunded state in Stripe and PostgreSQL.

Remaining before production rollout:

1. Complete the remaining Preview matrix: delayed payment success, late attendee cancellation, mentor no-show, eligible transfer, transfer reversal, active/lost/released disputes, and the unknown-actor admin-alert path.
2. Verify manual-review messages reach the configured `ADMIN_ALERT_EMAIL`; there is not yet a dedicated manual-review administration UI.
3. Decide the supported launch policy for mentor event types. The current fixture has Cal email verification restored to `true`, so the safety gate intentionally blocks new Checkout until the event is configured compatibly or Discuno implements its own verified-attendee flow.
4. Back up production, inspect the production schema diff, apply the schema, deploy with `PAYMENTS_ENABLED=false`, and repeat the signed webhook and read-only smoke checks before enabling paid traffic.

## Production rollout and recovery runbook

`PAYMENTS_ENABLED` is the server-side launch and incident switch for creating new paid Checkout sessions. It defaults to `false`; webhook processing deliberately remains active so already-paid sessions, refunds, disputes, and reversals can still settle safely. An already-created Stripe Checkout URL remains payable until it expires or is explicitly expired in Stripe, so the application switch alone is not a hard provider-side charge freeze.

Roll out in this order:

1. Complete every preview gate above and freeze unrelated production changes.
2. Take a Railway production backup and record table counts for users, bookings, payments, transfers, refunds, and disputes.
3. Keep `PAYMENTS_ENABLED=false`. Inspect the interactive production Drizzle diff, apply only the reviewed additive columns/tables and constraint changes, then rerun the push and require an empty diff.
4. Deploy the new Vercel application while new paid Checkout creation remains disabled. Verify public/auth routes, database connectivity, signed Stripe/Connect/Cal webhooks, Inngest registration and invocation, email delivery, and operational alerts.
5. Set `PAYMENTS_ENABLED=true`, redeploy during a monitored low-traffic window, and run one controlled paid booking. Verify the local ledgers, Cal.com booking, notifications, refund path, payout hold, and reconciliation before opening broader marketing traffic.

If an incident occurs:

1. Set `PAYMENTS_ENABLED=false` and redeploy immediately to stop creating new Checkout Sessions. For a hard charge freeze, also list and explicitly expire every relevant open Checkout Session in Stripe, then verify that none remain. Keep webhook endpoints enabled so in-flight financial events are acknowledged and reconciled.
2. Pause the affected Inngest payout function if transfers are unsafe; mark affected payments for manual review and reconcile Stripe objects against the local ledgers.
3. Keep the switch-aware deployment in place and fix forward. Do not promote a deployment that predates `PAYMENTS_ENABLED`, because it can reopen Checkout creation. If an older deployment is ever required, first enforce an independent provider-side block and verify it before promotion.
4. Do not drop ledger tables or restore an older database snapshot over live financial records. Refund/reverse through the payment service where required, and restore processing only after Stripe, Cal.com, and the database agree.

Useful commands:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm integrations:check:preview
pnpm db:push:preview
```

Use the Railway-guarded command in `AGENTS.md` for database integration tests. Never point the reset-based integration suite at a database without the expected test-environment guard marker.
