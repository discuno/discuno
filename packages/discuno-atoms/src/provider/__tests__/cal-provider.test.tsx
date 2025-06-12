import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalProvider, useCalContext } from '../cal-provider';

// Mock fetch globally
global.fetch = vi.fn();

// Test component to access context
const TestComponent = () => {
  const { apiClient, isAuthenticated, user } = useCalContext();

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="api-client">{apiClient ? 'present' : 'missing'}</div>
    </div>
  );
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CalProvider
        config={{
          apiUrl: process.env.TEST_CAL_API_URL || "https://api.cal.com/v2",
          accessToken: process.env.TEST_CAL_ACCESS_TOKEN || "test-token",
          refreshToken: process.env.TEST_CAL_REFRESH_TOKEN || "refresh-token",
          webAppUrl: process.env.TEST_CAL_WEB_APP_URL || "https://cal.com"
        }}
      >
        {children}
      </CalProvider>
    </QueryClientProvider>
  );
};

describe('CalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides context values correctly', async () => {
    // Mock successful user fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
      }),
    });

    const Wrapper = createWrapper();

    await act(async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );
    });

    // API client should be present
    expect(screen.getByTestId('api-client')).toHaveTextContent('present');

    // Wait for user to load and authenticate
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('handles authentication failure gracefully', async () => {
    // Mock failed user fetch
    (global.fetch as any).mockRejectedValueOnce(new Error('Unauthorized'));

    const Wrapper = createWrapper();

    await act(async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );
    });

    // API client should be present
    expect(screen.getByTestId('api-client')).toHaveTextContent('present');

    // Should remain unauthenticated after error
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useCalContext must be used within a CalProvider');

    consoleSpy.mockRestore();
  });

  it('initializes API client correctly', async () => {
    const Wrapper = createWrapper();

    await act(async () => {
      render(
        <Wrapper>
          <TestComponent />
        </Wrapper>
      );
    });

    // API client should be present after initialization
    expect(screen.getByTestId('api-client')).toHaveTextContent('present');
  });
});
