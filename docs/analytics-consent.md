# Analytics Consent

Discuno treats PostHog product analytics as optional. Essential authentication, abuse prevention,
payment, booking, and operational records are unaffected by this preference.

## Preference model

`discuno_user.analytics_enabled` is nullable:

- `null` means the user has not made an account-level choice. Optional analytics remains disabled.
- `true` is an explicit opt-in.
- `false` is an explicit opt-out.

The field applies to permanent and Better Auth temporary users. During anonymous account
conversion, an opt-out always follows the user. An opt-in is copied only when the permanent
account has no existing preference.

## Client behavior

PostHog starts opted out of capture and persistence, and events remain gated until consent resolves.
An unset preference stays disabled. Session replay is disabled even when product analytics is
enabled: the client explicitly stops recording and must not call `startSessionRecording`. Replay can
be considered only after Discuno adopts a separate disclosure, retention policy, and consent
control. Authenticated clients read and update `/api/preferences/analytics`; without a session,
PostHog's explicit browser preference is used. An existing browser denial overrides a stored enabled
value and is written back to the user. A deliberate opt-in can override DNT.

## Server behavior

`trackServerEvent` and `identifyUser` check the durable preference for UUID user identifiers before
creating a PostHog client. Only `true` permits user-level capture; `null`, `false`, missing identities,
and preference lookup failures fail closed. Non-user/system distinct IDs retain their previous
behavior.

## First-party discovery signals

Limited profile-view records used to rank mentor discovery remain first-party operational data. They
are stored independently of PostHog, do not reuse a PostHog distinct ID, and are not used for
advertising. The Privacy Policy discloses this separately from optional product analytics.

Apply schema changes through the repository's reviewed Drizzle schema-push workflow.
