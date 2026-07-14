import { vi } from 'vitest'

// Allow unit tests to import modules that correctly declare themselves server-only.
vi.mock('server-only', () => ({}))
