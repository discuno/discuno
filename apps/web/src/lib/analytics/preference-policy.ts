/**
 * Return the preference that should be written during anonymous account
 * conversion, or undefined when the permanent account must remain unchanged.
 */
export const getLinkedAnalyticsPreferenceUpdate = (
  anonymousPreference: boolean | null | undefined,
  linkedPreference: boolean | null | undefined
): boolean | undefined => {
  if (anonymousPreference === false) return false
  if (anonymousPreference === true && linkedPreference == null) return true
  return undefined
}
