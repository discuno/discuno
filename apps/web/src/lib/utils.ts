import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

/**
 * Properly decode URL query parameters, handling both + and %20 encoding
 */
export function decodeUrlParam(param: string | undefined): string {
  if (!param) return ''

  // URLSearchParams automatically handles both + and %20 encoding
  const searchParams = new URLSearchParams(`param=${param}`)
  return searchParams.get('param') ?? ''
}
