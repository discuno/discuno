# Database Scripts

This directory contains scripts for managing the database.

## Workflow

We use a "codebase-first" approach for managing the database schema. The TypeScript schema in `src/server/db/schema.ts` is the source of truth. We use `drizzle-kit push` to synchronize the database schema with the TypeScript schema. This is a more streamlined approach for rapid development and is well-suited for our MVP.

### Available Commands

- `pnpm db:push <env>`: Pushes the schema to the specified environment (local, preview, or prod).
- `pnpm db:seed <env>`: Seeds the database for the specified environment (local, preview, or prod).
- `pnpm db:reset:local`: Resets the local database by dropping all tables, pushing the schema, and seeding with sample data.
- `pnpm db:reset:preview`: Resets the preview database.
- `pnpm db:generate:local`: Generates TypeScript definitions from your local schema.
- `pnpm db:studio`: Starts the Drizzle Studio for your default environment.
