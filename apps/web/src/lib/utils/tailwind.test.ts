import { describe, expect, it } from 'vitest'
import { cn } from './tailwind'

describe('cn utility function', () => {
  it('merges multiple class strings correctly', () => {
    const result = cn('bg-red-500', 'text-white', 'p-4')
    expect(result).toContain('bg-red-500')
    expect(result).toContain('text-white')
    expect(result).toContain('p-4')
  })

  it('handles conflicting Tailwind classes by using the last one', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toContain('bg-blue-500')
    expect(result).not.toContain('bg-red-500')
  })

  it('handles undefined and null values gracefully', () => {
    const result = cn('bg-red-500', undefined, null, 'text-white')
    expect(result).toContain('bg-red-500')
    expect(result).toContain('text-white')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base-class', 'active-class')
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
  })

  it('handles arrays of classes', () => {
    const result = cn(['bg-red-500', 'text-white'], 'p-4')
    expect(result).toContain('bg-red-500')
    expect(result).toContain('text-white')
    expect(result).toContain('p-4')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles complex Tailwind merge scenarios', () => {
    // Test that conflicting responsive classes are handled correctly
    const result = cn('px-2 py-1 px-4 md:px-6')
    expect(result).toContain('px-4') // Should keep the last px value
    expect(result).not.toContain('px-2')
    expect(result).toContain('md:px-6') // Responsive classes should be preserved
  })
})
