<div align="center">

# Discuno

### 🚀 Modern Scheduling & Mentorship Platform

A professional monorepo built with Next.js, Cal.com scheduling, and Stripe Connect

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![CI](https://github.com/discuno/discuno/actions/workflows/ci.yml/badge.svg)](https://github.com/discuno/discuno/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-enabled-red?logo=turborepo)](https://turbo.build/)

[Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#️-tech-stack) • [Contributing](#-contributing) • [Documentation](#-documentation)

</div>

---

## ✨ Features

- 📅 **Reliable Scheduling** - Standard Cal.com OAuth, fail-closed booking contracts, and durable lifecycle processing
- 👥 **Mentorship Platform** - Connect mentors and mentees with advanced matching
- 🔐 **Secure Authentication** - Better Auth with email OTP, Google/Microsoft OAuth, and durable guest-account linking
- 📱 **Mobile-First Design** - Responsive UI built with Tailwind CSS & shadcn Base UI
- 💳 **Mentor Payments** - Server-authoritative Stripe Checkout with delayed Connect payouts
- 🧪 **Guarded Testing** - Fast unit tests plus isolated Railway database integration tests
- 🚀 **Performance Optimized** - Turbopack builds, Server Components, and Cache Components
- 🎨 **Modern UI** - Beautiful and responsive interface with Tailwind CSS & shadcn Base UI
- 📊 **Database Integration** - Type-safe queries with Drizzle ORM
- 🧭 **Privacy Controls** - Persistent analytics consent with session replay disabled

## 🏗️ Monorepo Structure

```
discuno/
├── apps/
│   └── web/                 # Main Next.js application
│       ├── src/
│       │   ├── app/         # App Router routes, APIs, and server actions
│       │   ├── components/  # UI primitives and business components
│       │   ├── lib/         # Shared utilities, providers, integrations
│       │   ├── server/      # Auth DAL, Drizzle schema, queries, ranking
│       │   │   ├── __tests__/  # Test setup & global configuration
│       │   │   └── db/      # Drizzle schema & database utilities
│       │   └── styles/      # Tailwind tokens and global styles
│       ├── scripts/         # Database and environment scripts
│       └── public/          # Static assets
├── drizzle.*.config.ts      # Root-level Drizzle configs (all environments)
├── .github/                 # GitHub Actions & templates
├── docs/                    # Documentation
└── [config files]          # Monorepo configuration (Turbo, TypeScript, etc.)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 24
- **pnpm** 11+
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/discuno/discuno.git
cd discuno

# Install dependencies
pnpm install

# Start all packages in development
pnpm dev
```

### Development Workflow

```bash
# Build the application
pnpm build

# Run quality checks
pnpm lint         # ESLint check
pnpm typecheck    # TypeScript validation
pnpm typecheck:tests # Test-suite TypeScript validation
pnpm test:coverage  # Run coverage-gated unit tests
pnpm test:e2e       # Run read-only Chromium smoke tests
pnpm format       # Format code with Prettier
pnpm integrations:check:local # Read-only service connectivity check

# Database operations
pnpm db:push:local # Review and push schema changes to the local database
pnpm db:studio    # Open Drizzle Studio (use db:studio:<env> for scoped access)
pnpm db:guard:local # One-time reset-guard provisioning; prints its required confirmation
```

## 📦 Application

### [Web App](./apps/web)

**Main Application** - Full-featured Next.js app with:

- 🔐 better-auth session management (email OTP + Google/Microsoft OAuth)
- 📊 Drizzle ORM + PostgreSQL/Railway
- 📅 Cal.com scheduling integration
- 💳 Stripe Checkout and Connect marketplace payments
- ⚙️ Inngest durable booking fulfillment and payout recovery
- 🎨 Tailwind CSS + shadcn/ui on Base UI
- 📱 Responsive design system
- 🔍 Advanced search & filtering

### Marketplace payment model

- The mentee pays the mentor's listed session price plus applicable tax; Discuno adds no buyer service fee.
- Discuno retains a 15% mentor-side commission and the mentor share is 85%.
- Checkout creates a platform charge. The mentor transfer is separate and becomes eligible after the scheduled session end plus 72 hours.
- Mentor cancellations, mentor no-shows, and mentee cancellations at least 24 hours before the session start receive a full refund. Refundable cancellations set mentor payout eligibility false.
- A mentee cancellation less than 24 hours before the start is non-refundable and remains eligible for the mentor's 85% share after the scheduled session end plus 72 hours. An authenticated Cal.com read confirms the cancellation and actor; the immutable first conservative observation determines the boundary.
- Paid Checkout temporarily reserves the selected Cal.com slot for 45 minutes around a 35-minute card Checkout and durably links both provider objects. This reduces concurrent Discuno checkout races; final Cal.com creation/reconciliation and the refund fallback remain authoritative.
- Paid booking fulfillment is retried through Inngest, and Cal.com retries reconcile the Discuno payment ID before creating another booking.
- Recovery uses an exact authenticated Cal.com GET once a UID is known; bounded metadata pagination is used only while it is unknown. Provider identity, schedule, payer, payment metadata, and reschedule lineage must all match Checkout.
- Immediately before a provider booking, fulfillment reconciles the authoritative Stripe PaymentIntent, charge, refunds, and disputes and rechecks the Cal.com event duration/compatibility. Holds or drift fail closed.
- Stripe transfers, refunds, and disputes are recorded in durable ledgers and reconciled before retrying a financial mutation. A `requires_action` refund hard-holds payout, reverses transferred mentor funds, and requires manual review.

## 🛠️ Tech Stack

<details>
<summary><strong>Core Technologies</strong></summary>

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router + Turbopack), React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, shadcn/ui Base UI primitives
- **Database**: Drizzle ORM, PostgreSQL (Railway)
- **Authentication**: better-auth (Drizzle adapter, email OTP, OAuth)
- **Build System**: Turbo

</details>

<details>
<summary><strong>Development Tools</strong></summary>

- **Testing**: Vitest, Testing Library, Playwright Chromium smoke tests, guarded PostgreSQL integration tests
- **Linting**: ESLint, TypeScript ESLint
- **Formatting**: Prettier, Tailwind Prettier plugin
- **Git Hooks**: Husky, lint-staged, Commitlint
- **CI/CD**: GitHub Actions
- **Package Management**: pnpm (fast, efficient)

</details>

<details>
<summary><strong>Infrastructure & Deployment</strong></summary>

- **Platform**: Vercel (optimized for Next.js)
- **Database**: Railway (PostgreSQL), Upstash Redis (rate limiting)
- **Payments**: Stripe Checkout + Connect (separate charges and transfers)
- **Scheduling**: Cal.com standard OAuth with per-mentor account connections
- **Durable Workflows**: Inngest
- **CDN**: Vercel Edge Network
- **Analytics**: PostHog
- **Email**: Resend transactional delivery

</details>

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- 🔧 Development setup
- 📝 Coding standards
- 🧪 Testing requirements
- 📋 Pull request process
- 🐛 Bug reporting
- 💡 Feature requests

### Quick Contribution Checklist

- [ ] Fork the repository
- [ ] Create a feature branch (`git checkout -b feature/amazing-feature`)
- [ ] Make your changes
- [ ] Add tests for new functionality
- [ ] Ensure all checks pass (`pnpm lint && pnpm typecheck && pnpm typecheck:tests && pnpm test:coverage`)
- [ ] Commit with conventional format (`feat: add amazing feature`)
- [ ] Push and create a Pull Request

## 📋 Roadmap

<details>
<summary><strong>Upcoming Features</strong></summary>

- [ ] 📚 Storybook integration for component documentation
- [ ] 🌍 Internationalization (i18n) support
- [ ] 📊 Advanced analytics dashboard
- [ ] 🔔 Real-time notifications system
- [ ] 🎯 Advanced matching algorithms
- [ ] 📱 Mobile app (React Native)
- [ ] 🤖 AI-powered scheduling suggestions

</details>

## 📄 Documentation

- [📖 Contributing Guide](CONTRIBUTING.md)
- [📜 Code of Conduct](CODE_OF_CONDUCT.md)
- [🔒 Security Policy](SECURITY.md)
- [📋 Changelog](CHANGELOG.md)
- [📅 Cal.com OAuth and Scheduling Operations](docs/calcom-oauth.md)
- [🚦 Modernization Rollout Runbook](docs/modernization-rollout.md)
- [🗣️ Positioning and Public Voice](docs/positioning.md)
- [⚖️ License](LICENSE)

## 📊 Project Stats

- **Languages**: TypeScript, JavaScript, CSS
- **Dependencies**: Modern, well-maintained libraries
- **Test Coverage**: Comprehensive test suites
- **Bundle Size**: Optimized for performance

## 📞 Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/discuno/discuno/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/discuno/discuno/discussions)
- 📧 **Security Issues**: [security@discuno.com](mailto:security@discuno.com)
- 🤝 **Code of Conduct**: [conduct@discuno.com](mailto:conduct@discuno.com)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## ✨ Sponsorship

We are proud to be sponsored by Cal.com, the scheduling infrastructure for everyone.

<a href="https://cal.com/discuno/30min?utm_source=banner&utm_campaign=oss" target="_blank">
  <picture>
    <source srcSet="https://cal.com/book-with-cal-dark.svg" media="(prefers-color-scheme: dark)" />
    <img alt="Book us with Cal.com" src="https://cal.com/book-with-cal-light.svg" />
  </picture>
</a>

---

<div align="center">
  <p>Made with ❤️ by the <strong>Discuno Team</strong></p>
  <p>⭐ Star us on GitHub if this project helped you!</p>
</div>
