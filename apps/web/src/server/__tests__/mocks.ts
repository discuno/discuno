import { vi } from 'vitest'

/**
 * Mock helpers for external services
 */

/**
 * Creates mock Cal.com API responses
 */
export const createCalcomMocks = () => {
  return {
    createManagedUser: vi.fn().mockResolvedValue({
      user: {
        id: Math.floor(Math.random() * 1000000),
        username: `testuser${Date.now()}`,
        email: 'test@example.com',
      },
    }),

    getAccessToken: vi.fn().mockResolvedValue({
      access_token: `test_access_token_${Date.now()}`,
      refresh_token: `test_refresh_token_${Date.now()}`,
      expires_in: 3600,
    }),

    createEventType: vi.fn().mockResolvedValue({
      event_type: {
        id: Math.floor(Math.random() * 1000000),
        title: 'Test Event',
        length: 30,
        price: 2500,
      },
    }),

    getBookings: vi.fn().mockResolvedValue({
      bookings: [],
    }),

    createBooking: vi.fn().mockResolvedValue({
      id: Math.floor(Math.random() * 1000000),
      uid: `test_booking_${Date.now()}`,
      title: 'Test Booking',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 1800000).toISOString(),
      status: 'ACCEPTED',
    }),

    cancelBooking: vi.fn().mockResolvedValue({
      success: true,
    }),
  }
}

/**
 * Creates mock Stripe API responses
 */
export const createStripeMocks = () => {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: `cs_test_${Date.now()}`,
          url: 'https://checkout.stripe.com/test',
          payment_status: 'unpaid',
        }),

        retrieve: vi.fn().mockResolvedValue({
          id: `cs_test_${Date.now()}`,
          payment_status: 'paid',
          payment_intent: `pi_test_${Date.now()}`,
        }),
      },
    },

    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({
        id: `pi_test_${Date.now()}`,
        status: 'succeeded',
        amount: 2500,
        currency: 'usd',
      }),
    },

    accounts: {
      create: vi.fn().mockResolvedValue({
        id: `acct_test_${Date.now()}`,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }),

      retrieve: vi.fn().mockResolvedValue({
        id: `acct_test_${Date.now()}`,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),

      update: vi.fn().mockResolvedValue({
        id: `acct_test_${Date.now()}`,
        charges_enabled: true,
        payouts_enabled: true,
      }),
    },

    transfers: {
      create: vi.fn().mockResolvedValue({
        id: `tr_test_${Date.now()}`,
        amount: 2000,
        currency: 'usd',
        destination: `acct_test_${Date.now()}`,
      }),
    },

    refunds: {
      create: vi.fn().mockResolvedValue({
        id: `re_test_${Date.now()}`,
        amount: 2500,
        status: 'succeeded',
      }),
    },

    accountLinks: {
      create: vi.fn().mockResolvedValue({
        url: 'https://connect.stripe.com/setup/test',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    },
  }
}

/**
 * Creates mock PostHog client
 */
export const createPostHogMocks = () => {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Creates mock email service
 */
export const createEmailMocks = () => {
  return {
    send: vi.fn().mockResolvedValue({
      id: `email_${Date.now()}`,
    }),
  }
}

/**
 * Utility to wait for async operations
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Utility to create a mock request with authentication
 */
export const createMockAuthRequest = (userId: string) => {
  return {
    headers: new Headers({
      cookie: `better-auth.session_token=test_session_${userId}`,
    }),
  }
}
