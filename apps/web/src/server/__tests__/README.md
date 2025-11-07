# Discuno Integration Test Suite

This directory contains comprehensive integration tests for the Discuno platform. These tests verify that all core user flows and business logic work correctly at a high level.

## Overview

The test suite is designed to:

- Test real user journeys from end to end
- Verify database integrity and relationships
- Ensure business logic correctness
- Catch regressions when code changes
- Provide confidence in deployments

## Test Structure

```
src/server/__tests__/
├── README.md                          # This file
├── setup.ts                           # Test setup and configuration
├── factories.ts                       # Test data factories
├── helpers.ts                         # Test utilities and assertions
├── mocks.ts                           # External service mocks
└── integration/                       # Integration test suites
    ├── user-auth-profile.test.ts      # User authentication & profiles
    ├── mentor-setup.test.ts           # Mentor onboarding & setup
    ├── booking-flow.test.ts           # Booking creation & management
    └── payment-processing.test.ts     # Payment & transfers
```

## Setup

Before running tests, you need to configure a test database:

### 1. Create `.env.test` file

Create `apps/web/.env.test` with your test database URL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/discuno_test"
SKIP_ENV_VALIDATION=1
```

**Important:** Use a separate test database, NOT your development database!

### 2. Initialize test database

```bash
# Create test database schema
pnpm db:push

# Or reset if it already exists
pnpm db:reset:test
```

## Running Tests

### Run all tests

```bash
pnpm test
```

### Run tests in watch mode

```bash
pnpm test:watch
```

### Run a specific test file

```bash
pnpm --filter @discuno/web vitest run src/server/__tests__/integration/booking-flow.test.ts
```

### Run tests with coverage

```bash
pnpm --filter @discuno/web test:coverage
```

## Test Categories

### 1. User Authentication & Profile Tests

**File:** `integration/user-auth-profile.test.ts`

Tests the complete user lifecycle:

- User registration with email
- Profile creation with school/major
- Profile updates and validation
- User data relationships
- Soft deletes and cascades

**Key scenarios:**

- ✅ User can create account with email
- ✅ User must have unique email
- ✅ User can create profile with school year and graduation year
- ✅ User can associate with school and multiple majors
- ✅ Profile data validates correctly (e.g., graduation year not in past)

### 2. Mentor Setup & Management Tests

**File:** `integration/mentor-setup.test.ts`

Tests mentor-specific functionality:

- Cal.com integration and tokens
- Event type creation and management
- Stripe account setup
- Mentor reviews and ratings
- Complete mentor onboarding flow

**Key scenarios:**

- ✅ Mentor can connect Cal.com account
- ✅ Mentor can create multiple event types with pricing
- ✅ Mentor can setup Stripe account for payouts
- ✅ Students can leave reviews with 1-5 star ratings
- ✅ Average rating calculated correctly

### 3. Booking Flow Tests

**File:** `integration/booking-flow.test.ts`

Tests the complete booking lifecycle:

- Booking creation from event types
- Attendee and organizer management
- Booking status transitions
- Time-based queries (upcoming/past)
- Booking cancellations

**Key scenarios:**

- ✅ Student can book a session with mentor
- ✅ Booking includes attendee and organizer info
- ✅ Booking status updates correctly (PENDING → ACCEPTED → COMPLETED)
- ✅ Students can view upcoming and past bookings
- ✅ Mentors can view all their bookings
- ✅ Cancellations handled properly

### 4. Payment Processing Tests

**File:** `integration/payment-processing.test.ts`

Tests payment and payout logic:

- Payment creation with fees
- Status transitions
- Transfer eligibility and processing
- Earnings tracking
- Refunds and disputes

**Key scenarios:**

- ✅ Payment created with correct fee split (platform vs mentor)
- ✅ Payment status transitions (PENDING → SUCCEEDED → TRANSFERRED)
- ✅ Dispute period enforced before transfers
- ✅ Mentor earnings calculated correctly
- ✅ Refunds processed for cancellations
- ✅ Disputed payments handled properly

## Test Utilities

### Factories (`factories.ts`)

Test data factories make it easy to create realistic test data:

```typescript
// Create a complete user with profile, school, and major
const { user, profile, school, major } = await createCompleteUser({
  user: { name: 'Test User', email: 'test@example.com' },
  profile: { schoolYear: 'Senior', graduationYear: 2025 },
})

// Create a complete mentor with Cal.com and event types
const mentor = await createCompleteMentor({
  user: { name: 'Expert Mentor' },
  eventType: { title: 'Career Chat', customPrice: 5000 },
})

// Create a complete booking with payment
const { booking, payment } = await createCompleteBooking(eventTypeId, mentorUserId, studentUserId)
```

### Helpers (`helpers.ts`)

Assertion helpers and utilities:

```typescript
// Assert a user exists
await assertUserExists(userId)

// Assert user is a mentor
await assertUserIsMentor(userId)

// Get upcoming bookings
const bookings = await getUpcomingBookings(userId, isMentor)

// Get mentor earnings
const earnings = await getMentorEarnings(mentorId)

// Date helpers
const tomorrow = futureDate(1)
const lastWeek = pastDate(7)
```

### Mocks (`mocks.ts`)

Mock external services for isolated testing:

```typescript
// Mock Cal.com API
const calcomMocks = createCalcomMocks()

// Mock Stripe API
const stripeMocks = createStripeMocks()

// Mock PostHog analytics
const posthogMocks = createPostHogMocks()
```

## Writing New Tests

### Best Practices

1. **Use factories** - Don't manually insert data, use factories
2. **Test user journeys** - Think about real user flows
3. **Clear test names** - Describe what's being tested
4. **Arrange-Act-Assert** - Structure tests clearly
5. **Clean up** - Tests should be isolated and repeatable

### Example Test

```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('should do something important', async () => {
    // Arrange: Set up test data
    const mentor = await createCompleteMentor()
    const student = await createCompleteUser()

    // Act: Perform the action
    const booking = await createTestBooking(mentor.eventType.id)

    // Assert: Verify the result
    expect(booking.id).toBeDefined()
    expect(booking.mentorEventTypeId).toBe(mentor.eventType.id)
  })
})
```

## Database Testing

### Test Database

Tests use a separate test database configured in `.env.test`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/discuno_test"
```

### Database Lifecycle

1. **Before all tests**: Database is reset via `pnpm db:reset:test`
2. **Before each test**: Database is cleared
3. **After each test**: Database is cleared
4. **Isolation**: Each test runs with a clean database state

### Migration Testing

Tests run against the latest schema. Always:

- Update schema in `src/server/db/schema.ts`
- Run `pnpm db:push` to apply changes to test DB
- Update factories and tests as needed

## CI/CD Integration

Tests run automatically:

- On every PR via GitHub Actions
- Before merging to main
- Coverage reports generated
- Minimum thresholds enforced (80% statements, 70% branches)

## Debugging Tests

### Run single test

```bash
pnpm --filter @discuno/web vitest run -t "should create a booking"
```

### Enable debug logging

```typescript
import { testDb } from '~/server/db/test-db'

// Log all queries
console.log(await testDb.query.user.findMany())
```

### Inspect test database

```bash
pnpm db:studio:test
```

## Common Issues

### Tests failing after schema changes

- Run `pnpm db:push` to update test database
- Update factories to match new schema
- Update tests to match new constraints

### Unique constraint violations

- Ensure `clearDatabase()` is called in `beforeEach`
- Use unique values in factories (timestamps, random numbers)

### Cascade delete issues

- Check foreign key constraints in schema
- Verify `onDelete` behavior matches expectations

## Coverage Goals

| Metric     | Target |
| ---------- | ------ |
| Statements | 80%    |
| Branches   | 70%    |
| Functions  | 80%    |
| Lines      | 80%    |

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Drizzle ORM Testing Guide](https://orm.drizzle.team/docs/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Check coverage meets thresholds
4. Update this documentation if needed

## Questions?

For questions about the test suite, please:

- Check this documentation
- Review existing tests for patterns
- Ask in the team chat
- Open a GitHub discussion
