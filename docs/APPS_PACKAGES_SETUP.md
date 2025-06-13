# Apps & Packages Modern Setup Guide

This document outlines the comprehensive modern setup implemented for both `apps/web` and `packages/discuno-atoms` to ensure they follow current best practices for 2025.

## 📋 Table of Contents

- [Overview](#overview)
- [Web App (`apps/web`)](#web-app-appsweb)
- [Atoms Package (`packages/discuno-atoms`)](#atoms-package-packagesdiscuno-atoms)
- [Shared Standards](#shared-standards)
- [Development Workflow](#development-workflow)
- [Quality Assurance](#quality-assurance)

---

## 🎯 Overview

Both the web application and component library have been modernized with:

- **Latest tooling versions** (ESLint 9, TypeScript 5.8, React 19)
- **Standardized configuration** across all tools
- **Modern testing setup** with Vitest
- **Comprehensive type safety** with strict TypeScript
- **Automated code quality** with husky, lint-staged
- **Professional documentation** and developer experience

---

## 🌐 Web App (`apps/web`)

### Technology Stack

| Category           | Technology                    | Version  |
| ------------------ | ----------------------------- | -------- |
| **Framework**      | Next.js                       | 15.3+    |
| **React**          | React                         | 19.1+    |
| **TypeScript**     | TypeScript                    | 5.8+     |
| **Database**       | Drizzle ORM + Neon PostgreSQL | Latest   |
| **Authentication** | NextAuth.js                   | 5.0 Beta |
| **Styling**        | Tailwind CSS                  | 4.1+     |
| **Testing**        | Vitest + Testing Library      | 3.2+     |
| **Payments**       | Stripe                        | Latest   |
| **Scheduling**     | Cal.com API v2                | Latest   |

### Modern Configuration Files

#### ✅ Next.js Configuration (`next.config.js`)

- **Turbo optimization** for faster builds
- **Package import optimization** for Lucide React and Radix UI
- **Security headers** (X-Frame-Options, CSP, etc.)
- **Image optimization** with WebP/AVIF support
- **Conditional error ignoring** (dev vs. CI)

#### ✅ TypeScript Configuration (`tsconfig.json`)

- **Strict type checking** enabled
- **Path aliases** for clean imports (`~/`)
- **Next.js plugin** integration
- **Composite project** support for monorepo

#### ✅ Drizzle Configuration (`drizzle.config.ts`)

- **Proper output directory** configuration
- **Table filtering** for Discuno namespace
- **Verbose logging** for development
- **Strict mode** enabled

### Development Experience

#### 🛠️ Scripts Available

```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm build            # Production build
pnpm start            # Start production server
pnpm preview          # Build and start locally

# Code Quality
pnpm lint             # ESLint checking
pnpm lint:fix         # Auto-fix ESLint issues
pnpm typecheck        # TypeScript type checking
pnpm format:write     # Prettier formatting
pnpm format:check     # Check Prettier formatting
pnpm check            # Run all quality checks

# Testing
pnpm test             # Run Vitest tests
pnpm test:coverage    # Run with coverage
pnpm test:ui          # Open Vitest UI
pnpm test:run         # Single test run

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
```

#### 🎯 Developer Setup Script

- **Automated environment setup** (`scripts/dev-setup.sh`)
- **Dependency verification** (Node.js, pnpm, git)
- **Environment file creation** from template
- **Git hooks setup** with husky
- **Quality checks** before first run

### Security & Performance

#### 🔒 Security Features

- **Security headers** in Next.js config
- **CSRF protection** with NextAuth.js
- **Input validation** with Zod schemas
- **Rate limiting** on API routes
- **Content Security Policy** headers

#### ⚡ Performance Optimizations

- **Turbo mode** for faster builds
- **Package import optimization**
- **Image optimization** with modern formats
- **Code splitting** with dynamic imports
- **Streaming** with React Suspense

---

## 🧩 Atoms Package (`packages/discuno-atoms`)

### Purpose & Architecture

The `@discuno/atoms` package is a **component library** providing:

- **Reusable UI components** for the Discuno ecosystem
- **Cal.com integration components** for booking flows
- **Availability management** components
- **Event type configuration** components
- **Type-safe APIs** for all interactions

### Modern Tooling Setup

#### ✅ Build System (`tsup.config.ts`)

- **Multi-format output** (ESM + CJS)
- **Multiple entry points** for tree-shaking
- **Client directive preservation** for React Server Components
- **Production minification**
- **Source maps** for debugging
- **TypeScript declaration files**

#### ✅ Testing Migration (Jest → Vitest)

- **Modern test runner** with better performance
- **ESM support** out of the box
- **Built-in TypeScript** support
- **Coverage reporting** with v8
- **Test UI** for better debugging
- **Mock utilities** for React components

#### ✅ Code Quality Stack

- **ESLint 9** with flat config
- **TypeScript ESLint** strict rules
- **React Hooks** linting
- **Prettier** with Tailwind plugin
- **Commitlint** for conventional commits
- **Husky + lint-staged** for git hooks

### Package Configuration

#### 📦 Package.json Features

```json
{
  "name": "@discuno/atoms",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

#### 🔧 Build Optimization

- **Tree-shaking support** with `sideEffects: false`
- **Multiple entry points** for selective imports
- **External dependencies** properly marked
- **Client directive** preservation for RSC

### Development Scripts

```bash
# Development
pnpm dev              # Watch mode with tsup
pnpm build            # Production build
pnpm build:clean      # Clean + build

# Quality Assurance
pnpm check            # Run all checks
pnpm typecheck        # TypeScript validation
pnpm lint             # ESLint checking
pnpm lint:fix         # Auto-fix issues
pnpm format:write     # Prettier formatting

# Testing (Modern Vitest Setup)
pnpm test             # Run tests in watch mode
pnpm test:run         # Single test run
pnpm test:coverage    # Coverage report
pnpm test:ui          # Interactive test UI
```

---

## 🔄 Shared Standards

### Configuration Consistency

Both packages implement identical standards for:

#### ✅ EditorConfig (`.editorconfig`)

- **2-space indentation** for consistent formatting
- **LF line endings** for cross-platform compatibility
- **UTF-8 encoding** for international characters
- **Trailing whitespace removal**

#### ✅ Prettier Configuration

```javascript
{
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 120,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss']
}
```

#### ✅ Commitlint Configuration

- **Conventional commits** enforcement
- **Consistent commit message** format
- **Automated changelog** generation support

#### ✅ Git Hooks (Husky + lint-staged)

```json
{
  "**/*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "**/*.{json,md,yml,yaml}": ["prettier --write"]
}
```

### TypeScript Configuration

#### 🎯 Strict Type Safety

- **Strict mode** enabled globally
- **No implicit any** enforcement
- **Consistent type imports** with ESLint
- **Path aliases** for clean imports
- **Composite projects** for monorepo optimization

#### 📝 Path Mapping Strategy

```json
// Web App
{
  "baseUrl": ".",
  "paths": {
    "~/*": ["./src/*"],
    "@discuno/atoms": ["../../packages/discuno-atoms/src"],
    "@discuno/atoms/*": ["../../packages/discuno-atoms/src/*"]
  }
}

// Atoms Package
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/hooks/*": ["./src/hooks/*"],
    "@/types/*": ["./src/types/*"]
  }
}
```

---

## 🔄 Development Workflow

### Daily Development Process

1. **Start Development**

   ```bash
   # In web app
   cd apps/web && pnpm dev

   # In atoms package (for component development)
   cd packages/discuno-atoms && pnpm dev
   ```

2. **Code Quality Checks** (Automated via git hooks)

   ```bash
   pnpm check    # Run all quality checks
   ```

3. **Testing**

   ```bash
   pnpm test             # Interactive testing
   pnpm test:coverage    # Coverage reporting
   ```

4. **Building**
   ```bash
   # From monorepo root
   pnpm build:packages   # Build all packages
   pnpm build:apps       # Build all apps
   ```

### Pre-commit Workflow

Thanks to husky + lint-staged, every commit automatically:

1. **Lints and fixes** TypeScript/JavaScript files
2. **Formats code** with Prettier
3. **Validates commit messages** with commitlint
4. **Runs type checking** for TypeScript files

### Continuous Integration

Both packages are configured for:

- **Automated testing** on every PR
- **Type checking** enforcement
- **Code quality** validation
- **Build verification**
- **Coverage reporting**

---

## ✅ Quality Assurance

### Automated Quality Gates

#### 🔍 Static Analysis

- **ESLint** with strict rules for code quality
- **TypeScript** strict mode for type safety
- **Prettier** for consistent formatting
- **Commitlint** for conventional commits

#### 🧪 Testing Strategy

- **Unit tests** for individual components/functions
- **Integration tests** for complex workflows
- **Type testing** for TypeScript definitions
- **Coverage thresholds** to maintain quality

#### 📊 Monitoring & Reporting

- **Build status** verification
- **Test coverage** reporting
- **Bundle size** monitoring
- **Performance** tracking

### Development Standards

#### ✅ Code Organization

- **Feature-based** directory structure
- **Co-location** of related files
- **Barrel exports** for clean public APIs
- **Consistent naming** conventions

#### ✅ Documentation

- **Comprehensive README** files
- **API documentation** with examples
- **Development guides** for contributors
- **Troubleshooting** sections

#### ✅ Performance

- **Tree-shaking** support for optimal bundles
- **Code splitting** for reduced initial load
- **Lazy loading** for non-critical components
- **Bundle analysis** for size optimization

---

## 🎉 Summary

Both `apps/web` and `packages/discuno-atoms` now feature:

### ✅ **Modern Tooling**

- Latest versions of all tools (ESLint 9, TypeScript 5.8, React 19)
- Optimized build systems (Next.js 15, tsup)
- Modern testing with Vitest

### ✅ **Developer Experience**

- Comprehensive VSCode configuration
- Automated setup scripts
- Git hooks for quality assurance
- Detailed documentation

### ✅ **Code Quality**

- Strict TypeScript configuration
- Comprehensive linting rules
- Automated formatting
- Test coverage requirements

### ✅ **Professional Standards**

- Conventional commits
- Semantic versioning
- Security best practices
- Performance optimization

### ✅ **Documentation**

- Professional README files
- API documentation
- Development guides
- Troubleshooting resources

The monorepo is now production-ready with industry-standard tooling and processes, providing an excellent foundation for open source development and collaboration.

---

For specific setup instructions, see:

- [Web App README](../apps/web/README.md)
- [Atoms Package README](../packages/discuno-atoms/README.md)
- [Monorepo Setup Guide](./MONOREPO_SETUP.md)
