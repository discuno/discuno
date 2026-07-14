<div align="center">

# Discuno

### 🚀 Modern Scheduling & Mentorship Platform

A professional monorepo built with Next.js, pnpm workspaces, and Cal.com integration

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

- 📅 **Seamless Scheduling** - Cal.com integration for professional booking management
- 👥 **Mentorship Platform** - Connect mentors and mentees with advanced matching
- 🔐 **Secure Authentication** - better-auth with email OTP + Google & Microsoft OAuth
- 📱 **Mobile-First Design** - Responsive UI built with Tailwind CSS & Radix UI
- 💳 **Mentor Payments** - Stripe Checkout and Connect-powered mentor payouts
- 🧪 **Guarded Testing** - Fast unit tests plus isolated Railway database integration tests
- 🚀 **Performance Optimized** - Turbopack builds, Server Components, and Cache Components
- 🎨 **Modern UI** - Beautiful and responsive interface with Tailwind CSS & Radix UI
- 📊 **Database Integration** - Type-safe queries with Drizzle ORM

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
pnpm test:run     # Run unit tests once
pnpm format       # Format code with Prettier
pnpm integrations:check:local # Read-only service connectivity check

# Database operations
pnpm db:push:local # Review and push schema changes to the local database
pnpm db:studio    # Open Drizzle Studio (use db:studio:<env> for scoped access)
```

## 📦 Application

### [Web App](./apps/web)

**Main Application** - Full-featured Next.js app with:

- 🔐 better-auth session management (email OTP + Google/Microsoft OAuth)
- 📊 Drizzle ORM + PostgreSQL/Railway
- 📅 Cal.com scheduling integration
- 🎨 Tailwind CSS + Radix UI
- 📱 Responsive design system
- 🔍 Advanced search & filtering

## 🛠️ Tech Stack

<details>
<summary><strong>Core Technologies</strong></summary>

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router + Turbopack), React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, Radix UI primitives
- **Database**: Drizzle ORM, PostgreSQL (Railway)
- **Authentication**: better-auth (Drizzle adapter, email OTP, OAuth)
- **Build System**: Turbo

</details>

<details>
<summary><strong>Development Tools</strong></summary>

- **Testing**: Vitest, Testing Library, guarded PostgreSQL integration tests
- **Linting**: ESLint, TypeScript ESLint
- **Formatting**: Prettier, Tailwind Prettier plugin
- **Git Hooks**: Husky, lint-staged, Commitlint
- **CI/CD**: GitHub Actions
- **Package Management**: pnpm (fast, efficient)

</details>

<details>
<summary><strong>Infrastructure & Deployment</strong></summary>

- **Platform**: Vercel (optimized for Next.js)
- **Database**: Railway (PostgreSQL), Redis (caching)
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry error tracking
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
- [ ] Ensure all checks pass (`pnpm lint && pnpm typecheck && pnpm test:run`)
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
