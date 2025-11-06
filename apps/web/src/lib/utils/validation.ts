/**
 * Validation utilities for common input types
 */

/**
 * Validates an email address using a standard email regex pattern
 * and ensures it ends with .edu
 * @param email - The email address to validate
 * @returns true if the email is valid and ends with .edu, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const endsWithEdu = email.toLowerCase().endsWith('.edu')
  return emailRegex.test(email) && endsWithEdu
}
