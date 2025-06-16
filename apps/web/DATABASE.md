# Database Management System

This document outlines the database management system for the Discuno web application using Drizzle ORM with Railway PostgreSQL databases.

## 🚀 **Important: Monorepo Usage**

**All database commands should be run from the root of the monorepo**, not from within the `apps/web` directory. The root `package.json` includes all database commands that delegate to the web application using pnpm workspaces.

```bash
# ✅ Correct - Run from root
cd /path/to/discuno
pnpm db:migrate:local

# ❌ Incorrect - Don't run from apps/web
cd /path/to/discuno/apps/web
pnpm db:migrate:local
```

## 🏗️ Architecture Overview

Our database system supports three environments:

- **Local** (`.env.local`) - Development environment
- **Preview** (`.env.preview`) - Staging environment
- **Production** (`.env.production`) - Production environment

## 📁 File Structure

```
apps/web/
├── drizzle.config.ts              # Default config (uses env.DATABASE_URL)
├── drizzle.local.config.ts        # Local development config
├── drizzle.preview.config.ts      # Preview/staging config
├── drizzle.production.config.ts   # Production config
├── scripts/
│   ├── db-migrate.ts              # Migration runner
│   ├── db-seed.ts                 # Database seeding
│   └── db-reset.ts                # Reset and reseed (dev only)
└── src/
    ├── lib/db/
    │   ├── migrate.ts             # Migration utilities
    │   └── seed.ts                # Seeding utilities
    └── server/db/
        └── schema.ts              # Database schema
```

## 🚀 Quick Start

### 1. Environment Setup

Ensure you have the following environment files with `DATABASE_URL`:

```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/discuno_local"

# .env.preview
DATABASE_URL="postgresql://username:password@preview.railway.app:5432/discuno_preview"

# .env.production
DATABASE_URL="postgresql://username:password@production.railway.app:5432/discuno_prod"
```

### 2. Generate and Run Migrations

```bash
# From the root of the monorepo
# Generate migration files
pnpm db:generate:local

# Apply migrations
pnpm db:migrate:local

# Seed with sample data
pnpm db:seed:local
```

## 📋 Available Commands

### Migration Commands

| Command                    | Description                           |
| -------------------------- | ------------------------------------- |
| `pnpm db:generate:local`   | Generate migrations for local         |
| `pnpm db:generate:preview` | Generate migrations for preview       |
| `pnpm db:generate:prod`    | Generate migrations for production    |
| `pnpm db:migrate:local`    | Run migrations on local database      |
| `pnpm db:migrate:preview`  | Run migrations on preview database    |
| `pnpm db:migrate:prod`     | Run migrations on production database |

### Development Commands

| Command                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `pnpm db:push:local`    | Push schema directly to local (no migration files) |
| `pnpm db:push:preview`  | Push schema directly to preview                    |
| `pnpm db:seed:local`    | Seed local database with sample data               |
| `pnpm db:seed:preview`  | Seed preview database with sample data             |
| `pnpm db:reset:local`   | Reset and reseed local database                    |
| `pnpm db:reset:preview` | Reset and reseed preview database                  |

### Database Studio

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| `pnpm db:studio:local`   | Open Drizzle Studio for local database      |
| `pnpm db:studio:preview` | Open Drizzle Studio for preview database    |
| `pnpm db:studio:prod`    | Open Drizzle Studio for production database |

## 🔒 Safety Features

### Production Safeguards

- **No automatic seeding** in production environment
- **No reset functionality** for production
- **Explicit environment parameters** required for production operations
- **Manual approval required** for production migrations in CI/CD

### Environment Validation

- All scripts validate environment parameters
- Clear error messages for invalid operations
- Comprehensive logging for all operations

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Database Migration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  migrate-preview:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run Preview Migrations
        env:
          DATABASE_URL: ${{ secrets.PREVIEW_DATABASE_URL }}
        run: pnpm db:migrate:preview

      - name: Seed Preview Database
        env:
          DATABASE_URL: ${{ secrets.PREVIEW_DATABASE_URL }}
        run: pnpm db:seed:preview

  migrate-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production # Requires manual approval
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run Production Migrations
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: pnpm db:migrate:prod
```

## 🛠️ Development Workflow

### 1. Schema Changes

```bash
# 1. Edit schema in apps/web/src/server/db/schema.ts
# 2. Generate migration (from root)
pnpm db:generate:local

# 3. Review generated migration in apps/web/drizzle/ folder
# 4. Apply migration (from root)
pnpm db:migrate:local

# 5. Test with fresh data (from root)
pnpm db:reset:local
```

### 2. Adding Seed Data

```bash
# Edit apps/web/src/lib/db/seed.ts to add new sample data
# Run seeding (from root)
pnpm db:seed:local
```

### 3. Database Reset (Development)

```bash
# Complete reset - drops all tables, runs migrations, seeds data (from root)
pnpm db:reset:local
```

## 🚨 Production Deployment

### Manual Process (Recommended)

1. Generate migrations locally: `pnpm db:generate:prod`
2. Review migration SQL files in `drizzle/` directory
3. Test migrations on preview environment first
4. Deploy to production manually: `pnpm db:migrate:prod`

### Automated with Approval

- Use GitHub Actions environment protection
- Require manual approval for production deployments
- Include rollback procedures in deployment process

## 📊 Database Schema

The database uses a multi-project schema approach with the `discuno_` prefix for all tables:

### Core Tables

- `discuno_user` - User accounts
- `discuno_user_profile` - Extended user information
- `discuno_account` - OAuth accounts (NextAuth)
- `discuno_session` - User sessions

### Business Logic Tables

- `discuno_major` - Academic majors
- `discuno_school` - Educational institutions
- `discuno_user_major` - User-major relationships
- `discuno_user_school` - User-school relationships
- `discuno_mentor_review` - Mentor reviews and ratings

### Integration Tables

- `discuno_calcom_token` - Cal.com integration tokens
- `discuno_waitlist` - User waitlist

## 🔧 Troubleshooting

### Common Issues

**Migration fails with connection error:**

```bash
# Check your DATABASE_URL in the correct .env file
# Verify Railway database is running
pnpm db:studio:local  # Test connection
```

**Seeding fails with constraint errors:**

```bash
# Reset database to clean state
pnpm db:reset:local
```

**TypeScript errors after schema changes:**

```bash
# Regenerate types
pnpm db:generate:local
pnpm typecheck
```

### Emergency Recovery

**Production database issues:**

1. Never use reset commands on production
2. Use Railway dashboard for database backups
3. Apply migrations one at a time
4. Test rollback procedures on preview first

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
- [Next.js Database Best Practices](https://nextjs.org/docs/app/building-your-application/data-fetching)

## 🤝 Contributing

When contributing database changes:

1. Always test on local environment first
2. Generate migrations for all schema changes
3. Update seed data if needed
4. Document breaking changes
5. Test migration rollback procedures
