# Checkout Flow Test Suite

Modern, concise test suite for the Stripe checkout → Inngest → Cal.com booking flow.

## Test Coverage

### 1. Webhook Handler Tests (`actions.test.ts`)

Tests the `handleCheckoutSessionWebhook` function:

#### ✅ Happy Path

- Creates payment record in database
- Triggers Inngest event with correct data
- Returns 200 OK to Stripe immediately

#### ✅ Idempotency

- Handles duplicate webhook calls gracefully
- Uses `onConflictDoNothing` for duplicate payment intents
- Returns 200 OK without triggering duplicate side effects

#### ✅ Validation

- Rejects sessions without metadata (400)
- Rejects sessions with incomplete metadata (400)
- Rejects sessions without payment intent (400)

#### ✅ Resilience

- Continues if Inngest send fails (logs error, returns 200)
- Payment record is always saved first

### 2. Inngest Function Tests (`functions.test.ts`)

Tests the `processCheckoutSideEffects` Inngest function:

#### ✅ Happy Path

- Tracks PostHog event
- Creates Cal.com booking
- Returns success result

#### ✅ PostHog Failure Handling

- Continues if PostHog tracking fails (non-critical)
- Still creates Cal.com booking

#### ✅ Cal.com Failure → Refund Flow

- Automatically refunds payment if booking fails
- Updates payment status to FAILED
- Sends failure email to customer
- Does NOT alert admin if refund succeeds

#### ✅ Refund Failure → Admin Alert

- Alerts admin when automatic refund fails
- Sends failure email with "contact support" message
- Logs all errors for debugging

#### ✅ Resilience

- Logs but doesn't fail if customer email fails
- Logs but doesn't fail if admin alert fails
- Throws retriable error if DB update fails (Inngest will retry)

## Running Tests

### Run all checkout tests

```bash
pnpm --filter @discuno/web test actions.test.ts functions.test.ts
```

### Run with coverage

```bash
pnpm --filter @discuno/web test:coverage actions.test.ts functions.test.ts
```

### Run in watch mode (development)

```bash
pnpm --filter @discuno/web vitest watch actions.test.ts functions.test.ts
```

### Run specific test file

```bash
pnpm --filter @discuno/web vitest run src/app/(app)/(public)/mentor/[username]/book/actions.test.ts
```

## Test Architecture

### Mock Strategy

- **External APIs**: Mocked (Stripe, Cal.com, PostHog)
- **Database**: Mocked with vitest mock functions
- **Inngest**: Mocked client and step/logger objects

### Test Data Factories

Located in `src/__tests__/helpers/test-factories.ts`:

- `createMockCheckoutSession()` - Stripe checkout session
- `createMockPaymentRecord()` - Payment DB record
- `createMockInngestEvent()` - Inngest event data

### Benefits of This Approach

1. **Fast**: No real API calls or DB connections
2. **Reliable**: No flaky tests from external services
3. **Isolated**: Tests one concern at a time
4. **Maintainable**: Clear mocking patterns

## What's NOT Tested (and Why)

### Integration Tests

These are **unit tests** focused on business logic. For end-to-end testing:

- Use Stripe's webhook testing tools
- Use Inngest Dev Server for local testing
- Manual QA in staging environment

### Database Schema

Database schema is tested via:

- Type safety (TypeScript + Drizzle)
- Migration validation (separate process)

### Inngest Retry Logic

Inngest's retry mechanism is handled by the platform:

- Test configuration (retries: 3)
- Use Inngest dashboard to verify retry behavior

## Debugging Failed Tests

### Check mock setup

```typescript
// Verify mocks are reset between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

### Inspect test output

```bash
# Run with verbose output
pnpm --filter @discuno/web vitest run --reporter=verbose
```

### Check for race conditions

```typescript
// Ensure async operations complete
await expect(promise).resolves.toBeTruthy()
```

## Adding New Tests

### For new webhook events

1. Add factory to `test-factories.ts`
2. Add test cases to `actions.test.ts`
3. Mock new dependencies in `beforeEach`

### For new Inngest steps

1. Update mock step object
2. Add test case in relevant describe block
3. Verify error handling paths

## CI/CD Integration

Tests run automatically on:

- ✅ Pull request creation
- ✅ Push to main branch
- ✅ Pre-commit hook (via Husky)

Fails if:

- ❌ Any test fails
- ❌ Coverage below threshold (80%)
- ❌ Type errors detected
