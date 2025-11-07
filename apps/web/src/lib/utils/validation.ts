/**
 * Validation utilities for common input types
 */

/**
 * Validates an email address using a standard email regex pattern
 * @param email - The email address to validate
 * @returns true if the email is syntactically valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates that an email address is syntactically valid and ends with .edu
 * @param email - The email address to validate
 * @returns true if the email is valid and ends with .edu, false otherwise
 */
export const validateEduEmail = (email: string): boolean => {
  return validateEmail(email) && email.trim().toLowerCase().endsWith('.edu')
}
