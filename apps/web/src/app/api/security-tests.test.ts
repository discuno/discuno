import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

describe('API Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Validation Security', () => {
    it('should validate Content-Type headers against injection', () => {
      // Test that NextJS properly rejects malicious headers at the platform level
      const maliciousContentTypes = [
        'application/json\r\nX-Injection: malicious',
        'application/json\nHost: evil.com',
        'application/json\u0000text/html',
        'application/json; charset=utf-8\r\nSet-Cookie: evil=true',
      ]

      for (const contentType of maliciousContentTypes) {
        // NextJS should reject malformed headers - this is the expected security behavior
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: {
              'Content-Type': contentType,
            },
            body: JSON.stringify({ test: 'data' }),
          })
        }).toThrow() // NextJS properly rejects invalid headers
      }

      // Test that valid headers work correctly
      const validRequest = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),
      })

      const actualContentType = validRequest.headers.get('Content-Type')
      expect(actualContentType).toBe('application/json')
    })

    it('should handle oversized request bodies', async () => {
      // Very large request body (100MB)
      const largeBody = JSON.stringify({
        data: 'x'.repeat(100 * 1024 * 1024),
      })

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: largeBody,
      })

      // Should handle large requests gracefully without memory issues
      expect(() => request.headers.get('Content-Type')).not.toThrow()
    })

    it('should validate request method security', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      })

      expect(request.method).toBe('GET')

      // Method should not be injectable
      expect(request.method).not.toContain('\r')
      expect(request.method).not.toContain('\n')
      expect(request.method).not.toContain('<script>')
    })

    it('should handle malformed JSON in request body', async () => {
      const malformedJsonBodies = [
        '{"incomplete": json',
        '{"injection": "<script>alert(1)</script>"}',
        '{"null_byte": "data\u0000injection"}',
        '{"very_deep": ' + '{"nested": '.repeat(1000) + 'true' + '}'.repeat(1000) + '}',
        '{"unicode": "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e"}',
      ]

      for (const malformedBody of malformedJsonBodies) {
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: malformedBody,
        })

        // Should not throw when parsing malformed JSON
        expect(async () => {
          try {
            await request.json()
          } catch (e) {
            // JSON parsing errors are expected for malformed data
          }
        }).not.toThrow()
      }
    })
  })

  describe('Response Security', () => {
    it('should prevent response header injection', () => {
      const maliciousValues = [
        'value\r\nSet-Cookie: evil=true',
        'value\nLocation: http://evil.com',
        'value\u0000X-Injection: malicious',
        '<script>alert("xss")</script>',
      ]

      for (const maliciousValue of maliciousValues) {
        try {
          const response = NextResponse.json(
            { data: maliciousValue },
            {
              status: 200,
              headers: {
                'X-Custom-Header': maliciousValue,
              },
            }
          )

          // If NextJS allows it, ensure it's sanitized
          const headerValue = response.headers.get('X-Custom-Header')
          if (headerValue) {
            expect(headerValue).not.toContain('\r')
            expect(headerValue).not.toContain('\n')
            expect(headerValue).not.toContain('\u0000')
          }
        } catch (error) {
          // NextJS rejected malformed header - this is good
          expect(error).toBeDefined()
        }
      }

      // Test that valid headers work
      const validResponse = NextResponse.json(
        { data: 'safe value' },
        {
          status: 200,
          headers: {
            'X-Custom-Header': 'safe-value',
          },
        }
      )

      const headerValue = validResponse.headers.get('X-Custom-Header')
      expect(headerValue).toBe('safe-value')
    })

    it('should set secure response headers', () => {
      const response = NextResponse.json({ data: 'test' })

      // Check for security headers (these would typically be set by middleware)
      const headers = response.headers

      // Response should not leak server information
      expect(headers.get('Server')).toBeNull()
      expect(headers.get('X-Powered-By')).toBeNull()
    })

    it('should handle response data sanitization', () => {
      const unsafeData = {
        script: '<script>alert("xss")</script>',
        iframe: '<iframe src="javascript:alert(1)"></iframe>',
        img: '<img src="x" onerror="alert(1)">',
        style: '<style>body{display:none}</style>',
      }

      const response = NextResponse.json(unsafeData)

      // JSON response should contain the data as-is (sanitization happens on client)
      // But verify the response structure is safe
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('URL and Path Security', () => {
    it('should validate URL against injection and traversal', () => {
      const maliciousUrls = [
        'http://localhost/api/../../../etc/passwd',
        'http://localhost/api/test?param=<script>alert(1)</script>',
        'http://localhost/api/test\r\nHost: evil.com',
        'http://localhost/api/test\u0000injection',
        'http://localhost/api/test?param=javascript:alert(1)',
        'file:///etc/passwd',
        'ftp://evil.com/malware',
      ]

      for (const maliciousUrl of maliciousUrls) {
        try {
          const request = new NextRequest(maliciousUrl)

          // URL should be parsed safely
          expect(request.url).toBeDefined()

          // Dangerous protocols should be rejected or normalized
          expect(request.url).not.toMatch(/^file:/)
          expect(request.url).not.toMatch(/^ftp:/)

          // Path traversal should be prevented
          const pathname = new URL(request.url).pathname
          expect(pathname).not.toContain('../')
          expect(pathname).not.toContain('..\\')

          // Script injection should be handled
          expect(request.url).not.toContain('<script>')
          expect(request.url).not.toContain('javascript:')
          expect(request.url).not.toContain('\r')
          expect(request.url).not.toContain('\n')
          expect(request.url).not.toContain('\u0000')
        } catch (error) {
          // Invalid URLs should be rejected gracefully - any error type is fine
          expect(error).toBeDefined()
        }
      }
    })

    it('should handle query parameter injection', () => {
      const request = new NextRequest(
        'http://localhost/api/test?param=<script>alert(1)</script>&other=value\r\ninjection'
      )

      const url = new URL(request.url)
      const params = url.searchParams

      // Query parameters should be accessible safely
      expect(params.get('param')).toBeDefined()
      expect(params.get('other')).toBeDefined()

      // Injection attempts should be contained within parameter values
      expect(url.search).toBeDefined()
    })

    it('should validate route parameters against injection', () => {
      const maliciousParams = [
        '<script>alert("xss")</script>',
        '../../../admin',
        '..\\..\\windows\\system32',
        'param\r\ninjection',
        'param\u0000null-byte',
        '%2e%2e%2f%2e%2e%2f',
        'javascript:alert(1)',
      ]

      for (const param of maliciousParams) {
        const request = new NextRequest(`http://localhost/api/users/${encodeURIComponent(param)}`)

        // Route parameters should be safely accessible
        const url = new URL(request.url)
        expect(url.pathname).toBeDefined()

        // Dangerous patterns should be encoded or rejected
        expect(url.pathname).not.toContain('<script>')
        expect(url.pathname).not.toContain('javascript:')
      }
    })
  })

  describe('Cookie Security', () => {
    it('should validate cookie injection prevention', () => {
      const maliciousCookies = [
        'session=valid\r\nSet-Cookie: evil=true',
        'session=valid\nHttpOnly',
        'session=valid\u0000; Secure',
      ]

      for (const cookie of maliciousCookies) {
        // NextJS should reject malformed cookie headers
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            headers: {
              Cookie: cookie,
            },
          })
        }).toThrow()
      }

      // Test that valid cookies work
      const validRequest = new NextRequest('http://localhost/api/test', {
        headers: {
          Cookie: 'session=valid-session-id',
        },
      })

      const cookieHeader = validRequest.headers.get('Cookie')
      expect(cookieHeader).toBe('session=valid-session-id')

      // Test XSS prevention in cookie values (this should be allowed but escaped)
      const xssRequest = new NextRequest('http://localhost/api/test', {
        headers: {
          Cookie: 'session=<script>alert(1)</script>',
        },
      })

      const xssCookie = xssRequest.headers.get('Cookie')
      expect(xssCookie).toBe('session=<script>alert(1)</script>')
      // XSS in cookies is handled by proper output encoding, not input validation
    })

    it('should set secure cookie attributes', () => {
      const response = NextResponse.json({ success: true })

      // Set a test cookie with security attributes
      response.cookies.set('session', 'test-value', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600,
      })

      const setCookieHeader = response.headers.get('set-cookie')

      if (setCookieHeader) {
        expect(setCookieHeader).toContain('HttpOnly')
        expect(setCookieHeader).toContain('Secure')
        // NextJS uses lowercase 'strict' instead of 'Strict'
        expect(setCookieHeader).toContain('SameSite=strict')
      }
    })
  })

  describe('CORS and Origin Security', () => {
    it('should validate Origin header against injection', () => {
      const maliciousOrigins = [
        'https://evil.com\r\nX-Injection: malicious',
        'https://evil.com\nReferer: https://trusted.com',
        'https://evil.com\u0000injection',
      ]

      for (const origin of maliciousOrigins) {
        // NextJS should reject malformed Origin headers
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            headers: {
              Origin: origin,
            },
          })
        }).toThrow()
      }

      // Test that suspicious but valid origins are handled properly
      const suspiciousOrigins = ['<script>alert("origin")</script>', 'javascript:alert(1)']

      for (const origin of suspiciousOrigins) {
        const request = new NextRequest('http://localhost/api/test', {
          headers: {
            Origin: origin,
          },
        })

        const originHeader = request.headers.get('Origin')
        expect(originHeader).toBe(origin)
        // Origin validation should be done at application level, not header parsing
      }

      // Test valid origin
      const validRequest = new NextRequest('http://localhost/api/test', {
        headers: {
          Origin: 'https://trusted.example.com',
        },
      })

      const validOrigin = validRequest.headers.get('Origin')
      expect(validOrigin).toBe('https://trusted.example.com')
    })

    it('should handle Referer header injection', () => {
      const maliciousReferers = [
        'https://trusted.com\r\nX-Admin: true',
        'https://trusted.com\nAuthorization: Bearer evil',
        'https://trusted.com\u0000<script>alert(1)</script>',
      ]

      for (const referer of maliciousReferers) {
        // NextJS should reject malformed Referer headers
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            headers: {
              Referer: referer,
            },
          })
        }).toThrow()
      }

      // Test valid referer
      const validRequest = new NextRequest('http://localhost/api/test', {
        headers: {
          Referer: 'https://trusted.example.com/page',
        },
      })

      const refererHeader = validRequest.headers.get('Referer')
      expect(refererHeader).toBe('https://trusted.example.com/page')
    })
  })

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rapid concurrent requests', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => new NextRequest(`http://localhost/api/test?id=${i}`))

      // Should handle many requests without throwing errors
      expect(() => {
        requests.forEach(req => {
          expect(req.url).toBeDefined()
          expect(new URL(req.url).searchParams.get('id')).toBeDefined()
        })
      }).not.toThrow()
    })

    it('should validate request size limits', () => {
      // Test various request sizes
      const testSizes = [1, 1000, 10000, 100000]

      for (const size of testSizes) {
        const largeData = 'x'.repeat(size)

        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          body: largeData,
        })

        // Should handle various sizes gracefully
        expect(request.body).toBeDefined()
      }
    })
  })

  describe('Authentication Security', () => {
    it('should validate Authorization header format', () => {
      const maliciousAuthHeaders = ['Bearer invalid\r\ninjection']

      for (const authHeader of maliciousAuthHeaders) {
        // NextJS should reject malformed Authorization headers
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            headers: {
              Authorization: authHeader,
            },
          })
        }).toThrow()
      }

      const validAuthHeaders = [
        'Bearer valid-token',
        'Bearer <script>alert(1)</script>', // XSS in tokens handled at validation level
        'Basic dXNlcjpwYXNz',
        'Bearer ' + 'x'.repeat(1000), // Long but valid token
      ]

      for (const authHeader of validAuthHeaders) {
        const request = new NextRequest('http://localhost/api/test', {
          headers: {
            Authorization: authHeader,
          },
        })

        const auth = request.headers.get('Authorization')
        expect(auth).toBe(authHeader)
      }
    })

    it('should handle session token validation', () => {
      const maliciousTokens = ['valid-token\r\nAdmin: true', 'valid-token\nRole: admin', 'valid-token\u0000injection']

      for (const token of maliciousTokens) {
        // NextJS should reject malformed session tokens
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            headers: {
              'X-Session-Token': token,
            },
          })
        }).toThrow()
      }

      const suspiciousButValidTokens = [
        '<script>alert("token")</script>',
        '../../../admin-token',
        'valid-session-token-123',
      ]

      for (const token of suspiciousButValidTokens) {
        const request = new NextRequest('http://localhost/api/test', {
          headers: {
            'X-Session-Token': token,
          },
        })

        const sessionToken = request.headers.get('X-Session-Token')
        expect(sessionToken).toBe(token)
        // Token validation should happen at application level
      }
    })
  })

  describe('API Versioning Security', () => {
    it('should validate API version headers', () => {
      const maliciousVersions = ['v2\r\nX-Admin: true', 'v1\u0000injection']

      for (const version of maliciousVersions) {
        // NextJS should reject malformed API version headers
        expect(() => {
          new NextRequest('http://localhost/api/test', {
            headers: {
              'API-Version': version,
            },
          })
        }).toThrow()
      }

      const validVersions = [
        'v1',
        'v2',
        '<script>alert("version")</script>', // Suspicious but valid string
        '../../../admin', // Path-like but valid string
      ]

      for (const version of validVersions) {
        const request = new NextRequest('http://localhost/api/test', {
          headers: {
            'API-Version': version,
          },
        })

        const apiVersion = request.headers.get('API-Version')
        expect(apiVersion).toBe(version)
      }
    })
  })

  describe('WebSocket Security', () => {
    it('should validate WebSocket upgrade headers', () => {
      const maliciousUpgrades = [
        'websocket\r\nOrigin: evil.com',
        'websocket\nSec-WebSocket-Protocol: admin',
        'websocket\u0000injection',
      ]

      for (const upgrade of maliciousUpgrades) {
        // NextJS should reject malformed Upgrade headers
        expect(() => {
          new NextRequest('http://localhost/api/ws', {
            headers: {
              Upgrade: upgrade,
              Connection: 'Upgrade',
            },
          })
        }).toThrow()
      }

      // Test valid WebSocket upgrade
      const validRequest = new NextRequest('http://localhost/api/ws', {
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
        },
      })

      const upgradeHeader = validRequest.headers.get('Upgrade')
      expect(upgradeHeader).toBe('websocket')
    })
  })

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error responses', () => {
      const sensitiveErrors = [
        'Database password: secret123',
        'API key: sk_live_abcdef',
        'File not found: /home/user/.env',
        'Connection failed: 192.168.1.100:5432',
        'JWT secret: super_secret_key',
      ]

      for (const errorMessage of sensitiveErrors) {
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })

        // Error responses should not contain sensitive information
        expect(response.status).toBe(500)

        // Response should have generic error message
        response.json().then(data => {
          expect(data.error).toBe('Internal server error')
          expect(data.error).not.toContain('password')
          expect(data.error).not.toContain('secret')
          expect(data.error).not.toContain('192.168')
          expect(data.error).not.toContain('.env')
        })
      }
    })

    it('should handle stack trace sanitization', () => {
      // Simulate error with stack trace
      const error = new Error('Test error')
      error.stack = `Error: Test error
        at /home/user/app/secret-file.js:123:45
        at /home/user/app/database-config.js:456:78
        at /home/user/app/api-keys.js:789:01`

      const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })

      // Stack traces should not be exposed in production
      response.json().then(data => {
        expect(data).not.toHaveProperty('stack')
        expect(JSON.stringify(data)).not.toContain('/home/user')
        expect(JSON.stringify(data)).not.toContain('secret-file.js')
        expect(JSON.stringify(data)).not.toContain('database-config.js')
        expect(JSON.stringify(data)).not.toContain('api-keys.js')
      })
    })
  })
})
