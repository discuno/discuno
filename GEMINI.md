# GEMINI.md

## Project Overview

This is a modern, professional monorepo for building a scheduling and mentorship platform. It uses Next.js for the frontend and has a backend integrated with Cal.com for scheduling. The project is built with pnpm workspaces and Turborepo for efficient monorepo management.

The main application is a Next.js web app located in `apps/web`. It uses the App Router, React components, and a server-side component architecture. The application is written in TypeScript and uses Drizzle ORM for type-safe database queries. Authentication is handled by NextAuth.js.

## Building and Running

### Prerequisites

- Node.js 20+
- pnpm 8+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/discuno/discuno.git
cd discuno

# Install dependencies
pnpm install
```

### Development

```bash
# Start all packages in development
pnpm dev
```

### Building

```bash
# Build the application
pnpm build
```

### Testing

```bash
# Run test suites
pnpm test
```

### Linting

```bash
# Run quality checks
pnpm lint
```

### Database

The project uses Drizzle ORM for database management. The following commands are available for database operations:

```bash
# Generate Drizzle schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

## Development Conventions

- **Monorepo:** The project is a monorepo managed with pnpm workspaces and Turborepo.
- **Language:** The project is written in TypeScript with strict mode enabled.
- **Styling:** The project uses Tailwind CSS and Radix UI for styling.
- **Testing:** The project uses Vitest and Testing Library for testing.
- **Linting:** The project uses ESLint and Prettier for linting and formatting.
- **Git Hooks:** The project uses Husky, lint-staged, and Commitlint for Git hooks.
- **CI/CD:** The project uses GitHub Actions for CI/CD.
