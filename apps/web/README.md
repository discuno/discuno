# Discuno Web App

> 🚀 **Modern mentorship platform connecting college students with high schoolers worldwide**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 📋 Overview

**Discuno Web App** is the main Next.js application providing a comprehensive mentorship platform. Built with modern technologies and best practices, it offers seamless scheduling, video calls, and payment processing for educational mentorship.

### 🌟 Key Features

- **📅 Smart Scheduling** - Integrated Cal.com booking system
- **🎥 Video Conferencing** - Built-in video calls with screen sharing
- **💳 Payment Processing** - Secure Stripe integration
- **👥 User Management** - Role-based access control
- **📊 Analytics Dashboard** - Comprehensive usage insights
- **🔐 Security-First** - Enterprise-grade authentication
- **📱 Mobile Responsive** - Progressive Web App capabilities
- **🌍 Global Ready** - Multi-timezone support

---

## 🛠️ Tech Stack

| Category           | Technologies                 |
| ------------------ | ---------------------------- |
| **Framework**      | Next.js 15, React 19         |
| **Styling**        | Tailwind CSS 4, Radix UI     |
| **Database**       | Neon PostgreSQL, Drizzle ORM |
| **Authentication** | NextAuth.js 5                |
| **Payments**       | Stripe                       |
| **Scheduling**     | Cal.com API v2               |
| **Monitoring**     | Sentry                       |
| **Testing**        | Vitest, Testing Library      |
| **Type Safety**    | TypeScript 5.8               |
| **Code Quality**   | ESLint 9, Prettier           |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** 8+
- **PostgreSQL** database (Neon recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/discuno/discuno.git
cd discuno/apps/web

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (dashboard)/     # Dashboard routes
│   │   ├── (public)/        # Public pages
│   │   └── api/             # API routes
│   ├── components/          # Reusable UI components
│   │   ├── shared/          # Shared components
│   │   └── ui/              # Base UI components
│   ├── lib/                 # Utility libraries
│   │   ├── auth/            # Authentication logic
│   │   └── providers/       # React providers
│   └── server/              # Server-side code
│       ├── auth/            # Auth configuration
│       └── db/              # Database schema & queries
├── public/                  # Static assets
└── docs/                    # Documentation
```

---

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # Lint code
pnpm lint:fix         # Fix linting issues
pnpm typecheck        # Check TypeScript
pnpm format:write     # Format code
pnpm format:check     # Check formatting

# Testing
pnpm test             # Run tests
pnpm test:coverage    # Test with coverage
pnpm test:ui          # Vitest UI

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Drizzle Studio
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Cal.com Integration
NEXT_PUBLIC_CAL_API_URL="https://api.cal.com/v2"
CAL_ACCESS_TOKEN="cal_live_..."

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (optional)
SENDGRID_API_KEY="SG...."
SMTP_HOST="smtp.gmail.com"

# Monitoring (optional)
SENTRY_DSN="https://..."
```

---

## 📋 Features in Detail

### 🔐 Authentication System

- **Multi-provider auth** (Google, GitHub, Magic Links)
- **Role-based permissions** (Student, Mentor, Admin)
- **Session management** with NextAuth.js
- **Email verification** workflow

### 📅 Scheduling Integration

- **Cal.com API v2** integration
- **Custom booking flows**
- **Timezone handling**
- **Calendar synchronization**

### 💳 Payment Processing

- **Stripe Connect** for mentors
- **Subscription management**
- **Payment history tracking**
- **Automated payouts**

### 📊 Admin Dashboard

- **User management**
- **Booking analytics**
- **Revenue tracking**
- **Content moderation**

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Open Vitest UI
pnpm test:ui
```

### Test Organization

- **Unit tests** - `src/**/*.test.ts`
- **Integration tests** - `src/__tests__/integration/`
- **E2E tests** - `tests/e2e/`

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod

# Or connect GitHub repository in Vercel dashboard
```

### Docker

```bash
# Build Docker image
docker build -t discuno-web .

# Run container
docker run -p 3000:3000 discuno-web
```

### Environment Setup

1. Configure environment variables in your deployment platform
2. Set up database with migrations: `pnpm db:migrate`
3. Configure domain and SSL certificates

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md).

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run quality checks: `pnpm lint && pnpm typecheck && pnpm test`
5. Commit using conventional commits
6. Push and create a Pull Request

---

## 📚 Documentation

- **[API Documentation](./docs/api.md)** - Backend API reference
- **[Component Guide](./docs/components.md)** - UI component documentation
- **[Database Schema](./docs/database.md)** - Database structure
- **[Deployment Guide](./docs/deployment.md)** - Production deployment

---

## 🐛 Troubleshooting

### Common Issues

**Database connection errors:**

```bash
# Check environment variables
pnpm db:push
```

**Build failures:**

```bash
# Clear Next.js cache
pnpm clean
pnpm install
```

**Type errors:**

```bash
# Regenerate types
pnpm typecheck
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

## 🔗 Links

- **🌐 Website:** [discuno.com](https://discuno.com)
- **📧 Support:** [support@discuno.com](mailto:support@discuno.com)
- **🐛 Issues:** [GitHub Issues](https://github.com/discuno/discuno/issues)
- **💬 Discussions:** [GitHub Discussions](https://github.com/discuno/discuno/discussions)

---

<div align="center">

**[⬆ Back to Top](#discuno-web-app)**

Made with ❤️ by the [Discuno Team](https://github.com/discuno)

</div>
