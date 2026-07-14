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

### Changed

- Migrated to monorepo architecture for better code organization
- Improved development workflow with Turbo build system
- Modernized the application to Node.js 24, pnpm 11, Next.js 16, and React 19
- Updated Cal.com to its organization-user APIs and current versioned booking, event type,
  schedule, slot, and webhook contracts
- Updated Stripe Checkout and Connect handling for the current API, retry-safe fulfillment, and
  asynchronous payment success events
- Made paid Checkout server-authoritative for mentor, event type, price, currency, duration, and
  connected-account resolution
- Adopted separate charges and transfers with no buyer service fee, a 15% Discuno mentor-side
  commission, and an 85% mentor transfer eligible after the scheduled end plus 72 hours when a
  session is completed, an attendee no-show, or otherwise accepted past its scheduled end
- Added per-payment locking and Stripe-side reconciliation for retry-safe transfers, refunds, and
  disputes, including transfer reversal and payout requeue after a released dispute
- Made paid Cal.com booking creation reconcile Discuno payment metadata before a retry creates a
  second booking
- Made the Cal cancellation event's `createdAt` timestamp authoritative for the inclusive 24-hour
  refund boundary; late mentee cancellations retain the normal delayed 85% mentor payout
- Made Stripe refunds in `requires_action` hard-hold payouts, reverse existing mentor transfers,
  and require manual review
- Added environment-aware integration checks and guarded database workflows for local, preview,
  test, and production environments

### Dependencies

- React 19.x
- Next.js 16.x
- TypeScript 5.x
- Tailwind CSS 4.x

---

## [1.0.0] - 2025-01-XX

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

### Tech Stack

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
