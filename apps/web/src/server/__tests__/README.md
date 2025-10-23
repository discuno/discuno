# Test Suite Documentation

## Overview

This test suite provides comprehensive end-to-end (e2e) testing for critical business logic in the Discuno platform. The tests validate essential user flows and data operations to ensure the application functions correctly.

## Test Files

### 1. `test-helpers.ts`
Provides reusable test utilities and helper functions for creating test data:
- User creation and management
- Cal.com token setup
- Event type creation
- Stripe account creation
- Booking creation with attendees/organizers
- School and major associations
- Data cleanup utilities

### 2. `mentor-profile.test.ts`
Tests mentor profile management:
- Creating complete mentor profiles
- Updating profile information
- Associating mentors with schools and majors
- Handling profile images
- Timezone management
- Maintaining ranking scores during updates

### 3. `event-types.test.ts`
Tests mentor event type configuration:
- Creating event types
- Enabling/disabling event types
- Setting pricing (free and paid)
- Multiple event types per mentor
- Stripe requirement for paid event types
- Event type filtering by enabled status

### 4. `stripe-account.test.ts`
Tests Stripe account setup and management:
- Creating pending Stripe accounts
- Account status transitions (pending → active)
- Charges and payouts enablement
- Onboarding completion tracking
- Account restrictions handling
- Requirements tracking
- Account ID uniqueness

### 5. `booking-lifecycle.test.ts`
Tests the complete booking lifecycle:
- Creating bookings
- Adding attendees and organizers
- Status transitions (accepted, cancelled, completed, rejected)
- Meeting URL tracking
- Time slot management
- No-show scenarios
- Cal.com ID tracking
- Complete booking structure with all participants

### 6. `calcom-integration.test.ts`
Tests Cal.com integration:
- Token creation and storage
- Access token expiration tracking
- Refresh token management
- Token refresh logic
- Force refresh scenarios
- Cal.com username and user ID tracking
- Token expiration detection

### 7. `mentor-onboarding.test.ts`
Tests the complete mentor onboarding flow (e2e):
- Full onboarding from signup to active mentor
- Profile completion with bio and image
- School and major associations
- Cal.com integration setup
- Event type creation and configuration
- Stripe account setup
- Onboarding step tracking
- Free-only mentor path (no Stripe required)
- Paid mentor path (Stripe required)
- Partial onboarding state handling

### 8. `analytics-ranking.test.ts`
Tests analytics events and ranking system:
- Profile view events
- Completed booking events
- Multiple event tracking
- Event processing status
- Ranking score calculations
- Event weight application
- Complex ranking scenarios
- Event timestamps

## Running Tests

### Prerequisites

1. **PostgreSQL Test Database**: Tests require a PostgreSQL database for integration testing.
2. **Environment Variables**: Configure `.env.test` with test database credentials.

### Local Development

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run a specific test file
pnpm --filter @discuno/web vitest run src/server/__tests__/mentor-profile.test.ts

# Run a specific test file in watch mode
pnpm --filter @discuno/web vitest watch src/server/__tests__/event-types.test.ts
```

### CI/CD

Tests are automatically run in GitHub Actions on:
- Pull requests
- Pushes to main branch
- Release workflows

The CI environment uses a test database configured via GitHub Secrets (`DATABASE_URL`).

## Test Database Setup

### Option 1: Local PostgreSQL

```bash
# Create test database
createdb discuno_test

# Update .env.test with connection string
DATABASE_URL=postgresql://user:password@localhost:5432/discuno_test

# Reset and seed test database
pnpm db:reset:test
```

### Option 2: Railway/Vercel Test Database

Create a separate test database instance and configure the connection string in `.env.test`.

### Database Configuration

The test database uses:
- **Config File**: `drizzle.test.config.ts`
- **Schema**: Same as production (`src/server/db/schema.ts`)
- **Table Prefix**: `discuno_*`
- **Casing**: `snake_case`

## Test Structure

All tests follow the same pattern:

```typescript
describe('Feature Name', () => {
  let testUserId: string

  beforeEach(async () => {
    // Set up test data
    const { user } = await createTestUser({ /* ... */ })
    testUserId = user.id
  })

  afterEach(async () => {
    // Clean up test data
    await cleanupTestUser(testUserId)
  })

  it('should perform expected behavior', async () => {
    // Arrange: Set up test conditions
    // Act: Perform the operation
    // Assert: Verify the results
  })
})
```

## Writing New Tests

When adding new tests:

1. **Use Test Helpers**: Leverage existing utilities in `test-helpers.ts`
2. **Follow Patterns**: Match the structure of existing tests
3. **Clean Up**: Always clean up test data in `afterEach`
4. **Descriptive Names**: Use clear, descriptive test names
5. **Atomic Tests**: Each test should be independent
6. **Avoid Mocks**: Use real database operations for e2e tests

Example:

```typescript
it('should create a mentor with complete profile', async () => {
  // Arrange
  const userData = {
    name: 'Test Mentor',
    email: 'test@example.com',
    bio: 'Test bio',
  }

  // Act
  const { user, profile } = await createTestUser(userData)

  // Assert
  expect(user.name).toBe('Test Mentor')
  expect(profile.bio).toBe('Test bio')
})
```

## Coverage Goals

The test suite aims for:
- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%

Coverage is enforced in `vitest.config.ts`.

## Troubleshooting

### Tests Failing to Connect to Database

**Error**: `ECONNREFUSED` or connection timeout

**Solution**: Ensure your test database is running and `DATABASE_URL` in `.env.test` is correct.

### Tests Timing Out

**Error**: Test exceeds timeout

**Solution**: 
- Check database performance
- Increase timeout in test file: `it('test', async () => { /* ... */ }, 30000)`
- Optimize test queries

### Foreign Key Constraint Errors

**Error**: Foreign key violations during cleanup

**Solution**: Use `cleanupTestUser` which handles cascading deletes in the correct order.

### Schema Mismatch

**Error**: Table or column doesn't exist

**Solution**: Reset the test database: `pnpm db:reset:test`

## Best Practices

1. **Isolation**: Tests should not depend on each other
2. **Idempotency**: Tests should produce the same results when run multiple times
3. **Speed**: Keep tests fast by using appropriate database operations
4. **Clarity**: Test names should clearly describe what is being tested
5. **Real Data**: Use realistic test data that matches production scenarios
6. **Edge Cases**: Test boundary conditions and error scenarios

## CI Configuration

Tests run in GitHub Actions with:
- Ubuntu latest
- Node.js (version specified in `.nvmrc`)
- PostgreSQL database (via GitHub environment secrets)
- 15-minute timeout
- Automatic cleanup after completion

## Future Improvements

Potential enhancements to the test suite:

- [ ] Add payment flow tests (Stripe checkout)
- [ ] Add webhook handler tests (Cal.com, Stripe)
- [ ] Add email notification tests
- [ ] Add search and filtering tests
- [ ] Add permission/authorization tests
- [ ] Add rate limiting tests
- [ ] Add concurrent booking tests
- [ ] Add data migration tests
- [ ] Performance benchmarks
- [ ] Load testing scenarios
