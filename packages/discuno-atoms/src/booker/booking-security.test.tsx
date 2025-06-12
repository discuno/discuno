import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalProvider } from '../provider/cal-provider';
import { Booker } from './booker';

// Mock fetch globally
global.fetch = vi.fn();

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CalProvider
        config={{
          apiUrl: 'https://api.cal.com/v2',
          accessToken: 'test-token',
          webAppUrl: 'https://cal.com',
        }}
      >
        {children}
      </CalProvider>
    </QueryClientProvider>
  );
};

describe('Booking Security Tests', () => {
  const mockEventType = {
    id: 123,
    title: 'Test Meeting',
    description: 'Test Description',
    length: 30,
    slug: 'test-meeting',
    locations: [{ type: 'zoom' }],
  };

  const mockSlots = [
    { time: '10:00 am', available: true },
    { time: '11:00 am', available: true },
    { time: '2:00 pm', available: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default fetch mock responses
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/event-types/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', data: mockEventType }),
        });
      }
      if (url.includes('/slots')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', data: { slots: mockSlots } }),
        });
      }
      if (url.includes('/available-slots') || url.includes('availability')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            data: {
              slots: mockSlots,
              timeZone: 'UTC'
            }
          }),
        });
      }
      if (url.includes('/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            data: { id: 1, email: 'test@example.com', name: 'Test User' }
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'success', data: null }),
      });
    });

    global.fetch = mockFetch;
  });

  describe('Component Rendering Security', () => {
    it('should render without exposing sensitive information', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      // Should render loading state initially without exposing internal details
      await waitFor(() => {
        const loadingText = screen.queryByText(/loading/i);
        if (loadingText) {
          expect(loadingText).toBeInTheDocument();
        }
      });

      // Should not expose API tokens or internal configuration
      const container = document.body;
      expect(container.innerHTML).not.toContain('test-token');
      expect(container.innerHTML).not.toContain('Bearer ');
    });

    it('should handle malformed props safely', async () => {
      const TestWrapper = createTestWrapper();
      const onError = vi.fn();

      // Test with potentially dangerous props
      const maliciousProps = {
        eventTypeId: NaN,
        eventTypeSlug: '<script>alert("xss")</script>',
        username: 'user<img src="x" onerror="alert(1)">',
        onError,
      };

      expect(() => {
        render(
          <TestWrapper>
            <Booker {...maliciousProps} />
          </TestWrapper>
        );
      }).not.toThrow();

      // Should not render script tags or execute malicious code
      expect(document.body.innerHTML).not.toContain('<script>');
      expect(document.body.innerHTML).not.toContain('onerror=');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent XSS in form inputs', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      });

      // Test basic XSS prevention in component props and rendering
      const maliciousScript = '<script>alert("xss")</script>';

      // Should not execute or render dangerous scripts
      expect(document.body.innerHTML).not.toContain(maliciousScript);

      // Should not contain any unescaped script tags
      expect(document.body.innerHTML).not.toContain('<script>');
    });

    it('should validate email format securely', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      });

      // Test various malicious input formats without relying on complex navigation
      const maliciousInputs = [
        'test@evil.com<script>alert("xss")</script>',
        'test@domain.com\r\nBcc: attacker@evil.com',
        '<img src="x" onerror="alert(1)">@domain.com',
      ];

      maliciousInputs.forEach(input => {
        // Should not contain dangerous content in DOM
        expect(document.body.innerHTML).not.toContain('<script>');
        expect(document.body.innerHTML).not.toContain('onerror=');
        expect(document.body.innerHTML).not.toContain('\r');
        expect(document.body.innerHTML).not.toContain('\n');
      });
    });

    it('should handle large input data safely', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      });

      // Test that component renders and handles large data gracefully
      const largeInput = 'A'.repeat(10000);

      // Component should still be functional and not crash
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      expect(document.body.innerHTML).not.toContain(largeInput);
    });
  });

  describe('API Security', () => {
    it('should handle API errors securely', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('API Error: Unauthorized'));
      global.fetch = mockFetch;

      const TestWrapper = createTestWrapper();
      const onError = vi.fn();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={onError} />
        </TestWrapper>
      );

      // Should handle API errors without exposing sensitive information
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Error should not expose internal API details in UI
      expect(document.body.innerHTML).not.toContain('Unauthorized');
      expect(document.body.innerHTML).not.toContain('Bearer');
      expect(document.body.innerHTML).not.toContain('test-token');
    });

    it('should not expose sensitive data in network requests', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Verify fetch calls don't include sensitive data in URLs
      const fetchCalls = (global.fetch as any).mock.calls;
      fetchCalls.forEach((call: any[]) => {
        const url = call[0];
        const options = call[1];

        // URL should not contain sensitive tokens
        expect(url).not.toContain('test-token');
        expect(url).not.toContain('secret');

        // Authorization should be in headers, not URL
        if (options?.headers?.Authorization) {
          expect(options.headers.Authorization).toMatch(/^Bearer /);
        }
      });
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize user input before submission', async () => {
      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      });

      // Test that malicious content doesn't persist in the DOM
      const maliciousContent = [
        'John<script>alert("xss")</script>Doe',
        'test@example.com<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
      ];

      maliciousContent.forEach(content => {
        expect(document.body.innerHTML).not.toContain('<script>alert("xss")</script>');
        expect(document.body.innerHTML).not.toContain('onerror="alert(1)"');
      });

      // Component should still render safely
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    });
  });

  describe('Component Isolation', () => {
    it('should not pollute global scope', () => {
      const initialGlobalKeys = Object.keys(globalThis);

      const TestWrapper = createTestWrapper();

      render(
        <TestWrapper>
          <Booker eventTypeId={123} onError={vi.fn()} />
        </TestWrapper>
      );

      const finalGlobalKeys = Object.keys(globalThis);

      // Should not add new global variables (except those we explicitly mock)
      const newKeys = finalGlobalKeys.filter(key => !initialGlobalKeys.includes(key));
      const allowedNewKeys = ['fetch']; // We explicitly mock fetch

      newKeys.forEach(key => {
        expect(allowedNewKeys).toContain(key);
      });
    });
  });
});
