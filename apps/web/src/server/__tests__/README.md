# Discuno Integration Test Suite

This directory contains a comprehensive integration test suite for the Discuno platform. The tests are designed to verify that all major user flows and business logic work correctly at a high level, ensuring a great user experience.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The test suite is built using:

- **Vitest** - Fast unit test framework
- **Testing Library** - For testing React components
- **jsdom** - Browser environment simulation
- **Test Database** - Isolated PostgreSQL database for testing

The tests focus on integration testing rather than unit testing, verifying that complete user workflows function correctly.

## Test Structure

```
src/server/__tests__/
├── README.md                           # This file
├── setup.ts                            # Global test setup
├── fixtures.ts                         # Test data factories
├── helpers.ts                          # Test utilities and assertions
└── integration/                        # Integration test suites
    ├── user-management.test.ts         # User CRUD, profiles, schools
    ├── mentor-workflows.test.ts        # Mentor onboarding, Cal.com, Stripe
    ├── booking-flows.test.ts           # Booking creation and lifecycle
    ├── payment-processing.test.ts      # Payment flows and transfers
    └── posts-and-analytics.test.ts     # Posts, events, ranking
```

### Test Files

#### `setup.ts`

Global setup and teardown for tests:

- Resets test database before all tests
- Clears database after all tests
- Mocks the database module to use test database

#### `fixtures.ts`

Reusable test data factories:

- `createTestUser()` - Create users with profiles
- `createTestMentor()` - Create mentors with integrations
- `createTestSchool()` / `createTestMajor()` - Reference data
- `createTestEventType()` - Mentor availability
- `createTestBooking()` - Bookings with attendees
- `createTestPayment()` - Payment records
- `createTestReview()` - Mentor reviews
- `createAnalyticsEvent()` - Analytics tracking

#### `helpers.ts`

Test utilities and assertions:

- `assertUser()`, `assertProfile()`, `assertBooking()`, `assertPayment()` - Custom assertions
- `futureDate()`, `pastDate()` - Date helpers
- `calculatePlatformFee()`, `calculateMentorAmount()` - Business logic helpers
- `assertRecentDate()` - Date validation
- `waitFor()` - Async condition helper

### Integration Tests

#### `user-management.test.ts`

Tests user registration, profiles, and data management:

- User creation with default profiles
- Profile updates (bio, school year, graduation year)
- School and major associations
- Soft deletes
- User search and filtering
- Data integrity and cascade deletes

**Key Scenarios:**

- ✅ Create user with default profile
- ✅ Update profile information
- ✅ Associate user with school and majors
- ✅ Soft delete users
- ✅ Filter by mentor status
- ✅ Sort by ranking score
- ✅ Enforce unique email constraint

#### `mentor-workflows.test.ts`

Tests mentor onboarding and setup:

- Mentor creation with Cal.com integration
- Stripe Connect account setup
- Event type creation and management
- Cal.com token management
- Mentor reviews and ratings
- Mentor discovery and filtering

**Key Scenarios:**

- ✅ Create fully onboarded mentor (Cal.com + Stripe)
- ✅ Manage OAuth tokens with refresh
- ✅ Create multiple event types with pricing
- ✅ Track Stripe onboarding status
- ✅ Submit and aggregate reviews
- ✅ Find mentors by availability

#### `booking-flows.test.ts`

Tests the complete booking lifecycle:

- Booking creation between mentor and student
- Organizer and attendee tracking
- Booking status management (pending, accepted, cancelled)
- Rescheduling bookings
- Querying upcoming and past bookings
- Booking statistics

**Key Scenarios:**

- ✅ Create booking with organizer and attendee
- ✅ Update booking status
- ✅ Handle cancellations with reasons
- ✅ Reschedule bookings
- ✅ Query upcoming vs past bookings
- ✅ Count completed bookings
- ✅ Handle multiple attendees

#### `payment-processing.test.ts`

Tests payment processing and transfers:

- Payment creation with platform fees
- Payment lifecycle (pending → succeeded → transferred)
- Stripe integration (checkout, payment intents, transfers)
- Mentor earnings calculation
- Payment queries and analytics
- Refunds and dispute periods

**Key Scenarios:**

- ✅ Create payment with 10% platform fee
- ✅ Track payment through lifecycle
- ✅ Handle payment failures
- ✅ Process refunds (full and partial)
- ✅ Calculate total earnings per mentor
- ✅ Query payments ready for transfer
- ✅ Filter by payment status

#### `posts-and-analytics.test.ts`

Tests content and analytics:

- Post creation and management
- Soft delete posts
- Analytics event tracking (profile views, bookings, reviews)
- Ranking score calculation
- View count tracking
- High-volume event handling

**Key Scenarios:**

- ✅ Create and soft delete posts
- ✅ Query posts with creator info
- ✅ Track profile views
- ✅ Record completed bookings
- ✅ Update ranking scores from events
- ✅ Rank users for discovery
- ✅ Handle score decay

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Specific Test File

```bash
pnpm --filter @discuno/web vitest run src/server/__tests__/integration/user-management.test.ts
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm --filter @discuno/web test:coverage
```

### Run Specific Test Suite

```bash
# User management tests only
pnpm --filter @discuno/web vitest run -t "User Management"

# Payment processing tests only
pnpm --filter @discuno/web vitest run -t "Payment Processing"
```

### Run Single Test

```bash
pnpm --filter @discuno/web vitest run -t "should create a user with a default profile"
```

## Test Coverage

The test suite covers the following areas:

### User Management (32 tests)

- ✅ User creation and profiles
- ✅ Profile updates
- ✅ School and major associations
- ✅ Soft deletes
- ✅ User search and filtering
- ✅ Data integrity

### Mentor Workflows (25 tests)

- ✅ Mentor setup and onboarding
- ✅ Cal.com OAuth integration
- ✅ Stripe Connect setup
- ✅ Event type management
- ✅ Review system
- ✅ Mentor discovery

### Booking Flows (28 tests)

- ✅ Booking creation
- ✅ Status management
- ✅ Booking queries
- ✅ Relations and statistics
- ✅ Time validation
- ✅ Edge cases

### Payment Processing (30 tests)

- ✅ Payment creation and fees
- ✅ Payment lifecycle
- ✅ Stripe integration
- ✅ Earnings calculation
- ✅ Transfer logic
- ✅ Refunds

### Posts & Analytics (26 tests)

- ✅ Post management
- ✅ Analytics events
- ✅ Ranking system
- ✅ View tracking
- ✅ User discovery

**Total: 141 integration tests**

## Writing New Tests

### 1. Use Fixtures for Test Data

```typescript
import { createTestUser, createTestMentor, createTestBooking } from '../fixtures'

it('should do something', async () => {
  const mentor = await createTestMentor({ withCalcomToken: true })
  const student = await createTestUser()
  const booking = await createTestBooking(mentor.id, student.id)

  // ... test logic
})
```

### 2. Use Custom Assertions

```typescript
import { assertUser, assertBooking, assertPayment } from '../helpers'

it('should update user', async () => {
  const user = await createTestUser()

  // ... update logic

  assertUser(user, {
    email: 'expected@example.com',
    name: 'Expected Name',
  })
})
```

### 3. Clean Up After Each Test

```typescript
afterEach(async () => {
  await clearDatabase()
})
```

### 4. Test Complete Workflows

Focus on integration over units:

```typescript
it('should complete booking and payment flow', async () => {
  // 1. Create mentor and student
  const mentor = await createTestMentor({ withStripeAccount: true })
  const student = await createTestUser()

  // 2. Create booking
  const booking = await createTestBooking(mentor.id, student.id)

  // 3. Process payment
  const payment = await createTestPayment(booking.id, {
    amount: 5000,
    status: 'succeeded',
  })

  // 4. Verify complete flow
  const fullBooking = await testDb.query.booking.findFirst({
    where: eq(schema.booking.id, booking.id),
    with: { payment: true },
  })

  expect(fullBooking?.payment).toBeTruthy()
})
```

### 5. Use Descriptive Test Names

```typescript
// ❌ Bad
it('should work', async () => { ... })

// ✅ Good
it('should create a payment with 10% platform fee', async () => { ... })
it('should handle booking cancellations with refunds', async () => { ... })
```

### 6. Test Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle zero-amount payments', async () => { ... })
  it('should prevent duplicate Cal.com booking IDs', async () => { ... })
  it('should cascade delete when parent is removed', async () => { ... })
})
```

## Best Practices

### ✅ DO

- Write tests that verify complete user workflows
- Use fixtures to create realistic test data
- Test both happy path and error cases
- Test data relationships and cascade behavior
- Use custom assertions for readability
- Clean up database after each test
- Group related tests in describe blocks
- Test edge cases and boundary conditions

### ❌ DON'T

- Don't test implementation details
- Don't share state between tests
- Don't use real external APIs (mock them)
- Don't skip database cleanup
- Don't write overly complex tests
- Don't test framework code
- Don't commit `.env.test` with real credentials

## Troubleshooting

### Tests Failing with Database Errors

**Issue:** `DATABASE_URL is not set in .env.test`

**Solution:** Create `.env.test` with test database URL:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/discuno_test"
```

### Tests Timing Out

**Issue:** Tests are taking too long or hanging

**Solution:**

1. Check database connection
2. Increase timeout in `vitest.config.ts`
3. Ensure `clearDatabase()` is called in `afterEach`

### Flaky Tests

**Issue:** Tests pass sometimes, fail other times

**Solution:**

1. Remove shared state between tests
2. Use `resetCounters()` in `beforeEach`
3. Add small delays for async operations
4. Check for proper test isolation

### "Unique Constraint" Errors

**Issue:** Tests fail with unique constraint violations

**Solution:**

1. Ensure `clearDatabase()` runs after each test
2. Use unique values in fixtures (timestamps, counters)
3. Check if previous test cleanup failed

### Test Database Not Resetting

**Issue:** Old data persists between test runs

**Solution:**

1. Run `pnpm db:reset:test` manually
2. Check `setup.ts` is configured correctly
3. Verify `clearDatabase()` function works

## Environment Setup

### Required Environment Variables (.env.test)

```bash
# Database
DATABASE_URL="postgresql://localhost:5432/discuno_test"

# Auth (can be test values)
BETTER_AUTH_SECRET="test-secret-min-32-chars-long-for-testing"
BETTER_AUTH_URL="http://localhost:3000"

# Skip validation for tests
SKIP_ENV_VALIDATION=1
```

### Database Setup

```bash
# Create test database
createdb discuno_test

# Run migrations
pnpm db:push

# Reset test database (if needed)
pnpm db:reset:test
```

## Continuous Integration

Tests run automatically on:

- Every pull request
- Every commit to main branch
- Before deployment

CI Pipeline:

1. Install dependencies
2. Set up test database
3. Run migrations
4. Run all tests
5. Generate coverage report

## Performance

The test suite is optimized for speed:

- **Parallel execution** - Tests run in parallel when possible
- **Database cleanup** - Efficient TRUNCATE operations
- **Test isolation** - No shared state between tests
- **Fast fixtures** - Optimized data creation
- **Transaction rollbacks** - (future optimization)

Current performance:

- ~141 tests run in < 30 seconds
- Individual test files: 2-5 seconds each

## Contributing

When adding new features:

1. Write integration tests for the feature
2. Use existing fixtures and helpers
3. Follow naming conventions
4. Test edge cases
5. Update this README if needed
6. Ensure tests pass before submitting PR

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Project CLAUDE.md](../../../CLAUDE.md)

---

**Questions or Issues?**

If you encounter any problems with the test suite, please:

1. Check this README first
2. Review existing tests for examples
3. Ask in the team chat
4. Create an issue in the repository
