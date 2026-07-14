# Checkout and Payment Test Coverage

This document describes tests that exist in the repository. It intentionally separates tested application behavior from checks that still require an integration environment.

## Automated unit coverage

### `checkout-webhook.test.ts`

Calls the real `handleCheckoutSessionWebhook` implementation while replacing its database and Inngest boundaries with deterministic fakes. It verifies that the handler:

- waits for Stripe to report a paid checkout before fulfillment;
- rejects missing or malformed metadata;
- rejects buyer fees, an incorrect 15%/85% split, inconsistent totals, and an invalid payout date;
- persists the validated payment ledger fields and queues a deterministic Inngest event;
- does not queue a second event after an already-queued webhook retry; and
- returns a retriable `500` when Inngest cannot accept the durable job.

The same file covers the small Stripe Checkout ID/status helpers.

### `../lib/stripe/marketplace.test.ts`

Exercises the pure marketplace policy at boundary values:

- no buyer fee and a rounded 15% mentor-side commission;
- cent-level rounding and invalid price inputs;
- payout eligibility at session end plus 72 hours;
- the inclusive 24-hour cancellation-refund boundary;
- late-cancellation payout eligibility through `mentor_payout_eligible`;
- mentor cancellation, invalid-time, refund-status, `requires_action` reversal, and dispute-status behavior; and
- expanded and unexpanded Stripe resource IDs.

### `stripe-refund.test.ts`

Calls the real Stripe refund helper with the Stripe client boundary replaced. It verifies platform-charge refund parameters, idempotency, and failure reporting. Separate-charge refunds must not set destination-charge flags.

### `mentor-booking-cancellation.test.ts`

Calls the real mentor cancellation service with its authorization, Cal.com, and refund boundaries replaced. It verifies ownership is established before Cal.com is called and that an owned cancellation triggers a refund.

### `calcom-webhook-schema.test.ts`

Verifies compatibility with the Cal.com booking and no-show payload shapes used by the webhook route, including nullable fields and forward-compatible unknown fields.

### `calcom-cancellation-webhook.test.ts`

Calls the real Cal.com webhook handler with provider and persistence boundaries replaced. It verifies that the signed event envelope's `createdAt` controls the inclusive 24-hour boundary, early cancellations disable payout and refund, and late mentee cancellations enable the normal delayed 85% mentor payout.

## Run the focused suite

From the repository root:

```bash
corepack pnpm --filter @discuno/web exec vitest run \
  src/__tests__/checkout-webhook.test.ts \
  src/lib/stripe/marketplace.test.ts \
  src/__tests__/stripe-refund.test.ts \
  src/__tests__/mentor-booking-cancellation.test.ts \
  src/__tests__/calcom-webhook-schema.test.ts \
  src/__tests__/calcom-cancellation-webhook.test.ts
```

Run all unit tests with `corepack pnpm test:run`. Database integration tests use the guarded Railway test environment documented in the repository's agent instructions.

## Not covered by these unit tests

The suite does not claim to emulate Stripe, Cal.com, Inngest, or PostgreSQL. Before production payment traffic, verify these paths in the preview environment:

1. A Stripe test checkout delivers the signed webhook and creates one local payment.
2. Inngest creates or reconciles exactly one Cal.com booking after retries.
3. Cal.com signed completion, cancellation, and no-show events update the expected booking state.
4. A due mentor payout creates one 85% transfer; a retry reconciles the existing Stripe transfer.
5. Refund and dispute events reverse or hold transfers and update the normalized ledgers.
6. The hourly payout reconciler recovers a deliberately missed payout event.

Direct Inngest function execution is not currently unit-tested. The previous `checkout-inngest.test.ts` only called standalone mocks and never imported the production function, so it was removed instead of being counted as coverage. Add a real executor-based test when the project adopts Inngest's test harness.
