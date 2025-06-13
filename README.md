# Discuno

<div align="center">
  <h3>🚀 Modern Scheduling & Mentorship Platform</h3>
  <p>A professional monorepo built with Next.js, pnpm workspaces, and Cal.com integration</p>

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![CI](https://github.com/discuno/discuno/actions/workflows/ci.yml/badge.svg)](https://github.com/discuno/discuno/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-enabled-red?logo=turborepo)](https://turbo.build/)

</div>

---

## ✨ Features

- 📅 **Seamless Scheduling** - Cal.com integration for professional booking management
- 👥 **Mentorship Platform** - Connect mentors and mentees with advanced matching
- 🔐 **Secure Authentication** - NextAuth.js v5 with multiple providers
- 📱 **Mobile-First Design** - Responsive UI built with Tailwind CSS & Radix UI
- 🧪 **Full Test Coverage** - Comprehensive testing with Vitest & Testing Library
- 🚀 **Performance Optimized** - Turbo builds, server components, and edge functions
- 🎨 **Component Library** - Reusable UI components with @discuno/atoms
- 📊 **Database Integration** - Type-safe queries with Drizzle ORM

## 🏗️ Monorepo Structure

```
discuno/
├── apps/
│   └── web/                 # Main Next.js application (@discuno/web)
│       ├── src/
│       │   ├── app/         # Next.js App Router
│       │   ├── components/  # React components
│       │   ├── lib/         # Utilities & configurations
│       │   └── server/      # Server-side code
│       ├── drizzle/         # Database migrations
│       └── public/          # Static assets
├── packages/
│   └── discuno-atoms/       # Shared UI components (@discuno/atoms)
│       ├── src/
│       │   ├── components/  # Reusable components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── lib/         # Utilities
│       │   └── types/       # TypeScript definitions
│       └── dist/            # Built package
├── .github/                 # GitHub Actions & templates
├── docs/                    # Documentation (coming soon)
└── [config files]          # Monorepo configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 8+ (package manager)
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
# Start specific packages
pnpm dev:web      # Web app only
pnpm dev:atoms    # Component library only

# Build all packages
pnpm build

# Run quality checks
pnpm lint         # ESLint check
pnpm typecheck    # TypeScript validation
pnpm test         # Run test suites
pnpm format       # Format code with Prettier

# Database operations
pnpm db:generate  # Generate Drizzle schema
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio
```

## 📦 Packages

### [@discuno/web](./apps/web)

**Main Application** - Full-featured Next.js app with:

- 🔐 NextAuth.js authentication
- 📊 Drizzle ORM + PostgreSQL/Neon
- 📅 Cal.com scheduling integration
- 🎨 Tailwind CSS + Radix UI
- 📱 Responsive design system
- 🔍 Advanced search & filtering

### [@discuno/atoms](./packages/discuno-atoms)

**Component Library** - Reusable components featuring:

- 🧩 Cal.com integration components
- 🎨 Consistent design tokens
- 📱 Mobile-responsive primitives
- 🔧 TypeScript support
- 📚 Storybook documentation (coming soon)

## 🛠️ Tech Stack

<details>
<summary><strong>Core Technologies</strong></summary>

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 15 (App Router), React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, Radix UI primitives
- **Database**: Drizzle ORM, PostgreSQL (Neon)
- **Authentication**: NextAuth.js v5
- **State Management**: Zustand, React Query/TanStack Query
- **Build System**: Turbo, tsup (for packages)

</details>

<details>
<summary><strong>Development Tools</strong></summary>

- **Testing**: Vitest, Testing Library, Playwright (E2E)
- **Linting**: ESLint, TypeScript ESLint
- **Formatting**: Prettier, Tailwind Prettier plugin
- **Git Hooks**: Husky, lint-staged, Commitlint
- **CI/CD**: GitHub Actions, Dependabot
- **Package Management**: pnpm (fast, efficient)

</details>

<details>
<summary><strong>Infrastructure & Deployment</strong></summary>

- **Platform**: Vercel (optimized for Next.js)
- **Database**: Neon (PostgreSQL), Redis (caching)
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry error tracking
- **Analytics**: Vercel Analytics
- **Email**: SendGrid integration

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
- [ ] Ensure all checks pass (`pnpm lint && pnpm typecheck && pnpm test`)
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
- **Packages**: 2 workspace packages
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

<div align="center">
  <p>Made with ❤️ by the <strong>Discuno Team</strong></p>
  <p>⭐ Star us on GitHub if this project helped you!</p>
</div>
