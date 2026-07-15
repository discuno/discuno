# Authentication Operations

Discuno uses Better Auth with PostgreSQL sessions, Google and Microsoft OAuth,
email OTP, anonymous checkout identities, and permission checks at the query
layer.

## Environment setup

- Give every environment its own Better Auth key material (at least 32 characters). Configure
  `BETTER_AUTH_SECRETS` for a versioned key ring, `BETTER_AUTH_SECRET` for a legacy-only deployment,
  or both while migrating. At least one is required.
- Set `OAUTH_PROXY_SECRET` to one dedicated 32+ character value shared by
  production, previews, and local development. Do not reuse
  any Better Auth encryption/signing key for this purpose.
- Keep `BETTER_AUTH_PRODUCTION_URL` on the canonical production origin.
- Set `BETTER_AUTH_URL` to the environment's explicit origin. Vercel previews
  automatically use the exact `VERCEL_URL` supplied by Vercel.
- Add stable preview or custom origins to the comma-separated
  `BETTER_AUTH_TRUSTED_ORIGINS` allowlist. Entries must be origins without credentials, paths,
  queries, or fragments. Every shared-host deployment such as `*.vercel.app` must use an exact
  origin, even when its project-name prefix appears fixed. Wildcards are accepted only for custom
  domains Discuno controls.
- Register only the canonical production callback URLs with Google and
  Microsoft. Better Auth's OAuth proxy returns preview and local flows to their
  originating environment.

Generate secrets without copying them into shell history:

```bash
openssl rand -base64 48
```

The OAuth proxy secret must be rotated in every environment as one coordinated
change. Rotating only one environment breaks preview and local OAuth flows.

For the first Better Auth key rotation, put a new versioned primary first in
`BETTER_AUTH_SECRETS` and retain `BETTER_AUTH_SECRET` separately only for pre-envelope values; do
not copy the legacy secret into the new ring. On later rotations, older ring entries are
decryption-only. Remove `BETTER_AUTH_SECRET` only after legacy data is audited or migrated, and
remove a retired ring entry only after every envelope using its version has expired or been
rewritten. A versioned-only terminal configuration is supported. Rotating the active key
invalidates OTPs still inside their five-minute window, so perform a controlled rollout and test a
fresh code. Rotate `OAUTH_PROXY_SECRET` as one coordinated change across all environments.

## Security defaults

- Session records expire after seven days and refresh daily.
- Signed session-cookie data is cached for five minutes. Query-layer permission
  checks bypass the cookie cache so revocation is immediate.
- OAuth access, refresh, and ID tokens are encrypted before new writes.
- Email OTPs are HMAC-hashed, expire after five minutes, and allow three verification attempts.
  A coarse network bucket permits 30 requests per five minutes so shared campus/NAT traffic does
  not lock out unrelated students; a separate HMAC-addressed recipient bucket permits three sends
  per 15 minutes without storing or logging the email address in rate-limit keys. The recipient
  check runs before Better Auth stores or rotates a code, so a blocked request cannot invalidate a
  previously delivered OTP.
- OTP delivery uses Better Auth's background-task hook and Next.js `after()` so the request does not
  wait on the email provider or expose provider latency as an account-enumeration signal, while the
  serverless runtime still keeps the send alive. Rendering/provider failures are caught inside the
  background task and log only a fixed error category.
- Core Better Auth rate limits use an atomic Upstash Redis fixed-window counter; the dedicated
  recipient limit uses an atomic sliding window. Both fail closed if Redis cannot provide a valid
  result.
- `deletedAt` and other lifecycle fields are server-owned and cannot be set via
  Better Auth client input.

## Anonymous checkout conversion

Checkout may capture a Better Auth guest ID before the student signs into a permanent account.
Better Auth deletes that guest record after linking, while Stripe webhooks and Inngest work can
arrive later. `discuno_anonymous_user_link` therefore keeps a durable guest-to-account redirect;
the guest side intentionally has no foreign key, and the permanent side cascades on deletion.

The link callback creates that mapping and moves local attribution in one database transaction. It
also transfers a guest-owned Stripe Customer when safe, applies the analytics-consent merge policy,
and updates booking and analytics references. It never changes the permanent account's existing
role; admin and other explicitly assigned authorization survives linking. Pending payment metadata is rewritten only before a
Cal.com booking has been established; delayed work resolves captured IDs through
`resolveCanonicalUserId` instead of trusting a possibly deleted guest row. A pre-existing mapping to
a different permanent account aborts the conversion.

When adding an asynchronous workflow that stores a user ID before sign-in, either persist the
canonical ID after conversion or resolve it through the same DAL before creating a foreign-keyed
record. Never recover identity by matching email.

## Deployment checks

After changing authentication configuration:

1. Test email OTP sign-in and exhaustion of the request/attempt limits.
   Also force one email-provider failure and confirm the request contract and logs remain
   recipient-safe while a healthy background send still completes after the response.
2. Test Google and Microsoft sign-in on production and one preview deployment.
3. Test OAuth from local development through the production proxy.
4. Revoke a session and confirm a permission-protected query rejects it
   immediately.
5. Confirm Redis contains only prefixed `better-auth:rate-limit:*` and
   `ratelimit:auth-otp-recipient:*` keys with short TTLs, and that recipient keys contain no email
   addresses.
6. Start a guest Checkout, link the guest to a permanent account, and confirm delayed fulfillment
   attributes the booking to the permanent user without creating a second Stripe Customer.

Current upstream references:

- [Better Auth OAuth proxy](https://better-auth.com/docs/plugins/oauth-proxy)
- [Better Auth session management](https://better-auth.com/docs/concepts/session-management)
- [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit)
- [Better Auth email OTP](https://better-auth.com/docs/plugins/email-otp)
