# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monorepo structure with pnpm workspaces and Turborepo
- Professional open source project setup
- Comprehensive GitHub Actions CI/CD pipeline
- Code of Conduct and Contributing guidelines
- Security policy and issue templates
- Durable Stripe transfer, refund, and dispute ledgers with manual-review state
- Hourly Inngest payout reconciliation for missed, delayed, or manually released payout events
- Discuno-user-bound Stripe Customer IDs to prevent unsafe email-based customer reuse
- Explicit booking-level `mentor_payout_eligible` state for payable late mentee cancellations
- Durable Cal.com slot-reservation/Stripe Checkout attempt bridges with explicit abandoned-session cleanup
- Route-scoped Cal.com webhook inboxes, lifecycle leases, cleanup outboxes, and recovery jobs
- Durable anonymous-to-permanent identity links and explicit opt-in analytics preferences
- Durable Cal.com create-attempt markers that make ambiguous paid-booking retries reconciliation-only

### Changed

- Migrated to monorepo architecture for better code organization
- Improved development workflow with Turbo build system
- Modernized the application to Node.js 24, pnpm 11, Next.js 16, and React 19
- Replaced the retired Cal.com Platform integration with standard per-mentor OAuth, encrypted
  rotating credentials, least-privilege scopes, and current versioned booking, event type,
  schedule, slot, and webhook contracts
- Updated Stripe Checkout and Connect handling for the current API, retry-safe fulfillment, and
  asynchronous payment success events
- Made paid Checkout server-authoritative for mentor, event type, price, currency, duration, and
  connected-account resolution
- Added a 45-minute Cal.com slot hold around a 35-minute card-only hosted Checkout. The hold reduces
  concurrent Discuno races while final authenticated booking reconciliation and refunds remain the
  authoritative conflict fallback.
- Persisted exact generation-scoped Checkout requests and re-attested Cal.com holds before Stripe;
  stale snapshots roll only after Stripe's definitive `expires_at` validation response, while
  ambiguous failures retain the original generation.
- Adopted separate charges and transfers with no buyer service fee, a 15% Discuno mentor-side
  commission, and an 85% mentor transfer eligible after the scheduled end plus 72 hours when a
  session is completed, an attendee no-show, or otherwise accepted past its scheduled end
- Added per-payment locking and Stripe-side reconciliation for retry-safe transfers, refunds, and
  disputes, including transfer reversal and payout requeue after a released dispute
- Made paid Cal.com booking creation reconcile Discuno payment metadata before the first POST and
  made every retry after a possible provider mutation reconciliation-only. Terminal paths reconcile
  and attest Cal.com under the payment lock before any automatic refund.
- Made an OAuth-authenticated Cal.com booking read authoritative for paid cancellation status,
  actor, and identity. The immutable first conservative observation determines the inclusive
  24-hour boundary; late proven mentee cancellations retain the normal delayed 85% mentor payout.
- Updated Cal.com webhook IDs to current UUID contracts, provisioned current supported triggers
  including `MEETING_ENDED`, and retained `BOOKING_COMPLETED` only as legacy inbound compatibility.
- Made Cal.com webhook provisioning and audits consume the complete `take`/`skip` inventory instead
  of assuming a single provider page.
- Made Stripe refunds in `requires_action` hard-hold payouts, reverse existing mentor transfers,
  and require manual review
- Added environment-aware integration checks and guarded database workflows for local, preview,
  test, and production environments
- Moved Better Auth email delivery onto Next.js post-response background tasks, preserving
  serverless completion without exposing email-provider latency or raw provider failures.

### Dependencies

- React 19.x
- Next.js 16.x
- TypeScript 6.x
- Tailwind CSS 4.x

---

## [1.0.0] - 2025-10-19

### Added

- Initial release of Discuno platform
- Cal.com integration for scheduling
- User authentication and profile management
- Mentorship booking system
- Modern UI components
- Professional development environment setup

### Features

- 📅 **Scheduling**: Seamless calendar integration with Cal.com
- 👥 **Mentorship**: Connect mentors and mentees efficiently
- 🔐 **Authentication**: Secure user management with NextAuth.js
- 📱 **Responsive**: Mobile-first design with Tailwind CSS
- 🧪 **Testing**: Comprehensive test coverage with Vitest
- 🚀 **Performance**: Optimized builds with Turbo and Next.js

### Historical Tech Stack at v1.0.0

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI primitives
- **Database**: Drizzle ORM with PostgreSQL/Railway
- **Authentication**: NextAuth.js v5
- **Monorepo**: pnpm workspaces + Turborepo
- **Testing**: Vitest, Testing Library
- **CI/CD**: GitHub Actions

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
