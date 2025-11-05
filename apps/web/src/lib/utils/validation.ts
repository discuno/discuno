/**
 * Validation utilities for common input types
 */

/**
 * Validates an email address using a standard email regex pattern
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
