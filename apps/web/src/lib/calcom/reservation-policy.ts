/** Cal.com/Stripe timing policy shared by checkout, cleanup, and connection guards. */
export const CALCOM_CHECKOUT_RESERVATION_MINUTES = 45

// Covers the provider hold plus request/clock cleanup margin. While this window
// is open, an unbound reservation POST may still have committed remotely.
export const CALCOM_RESERVATION_ACQUISITION_AMBIGUITY_MINUTES =
  CALCOM_CHECKOUT_RESERVATION_MINUTES + 5
