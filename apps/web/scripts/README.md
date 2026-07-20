# Database Scripts

The TypeScript schema lives in `src/server/db/schema/` and is re-exported through `index.ts`.
Discuno uses reviewed `drizzle-kit push` diffs rather than generated migration files.

## Schema workflow

Run schema pushes from the repository root:

```bash
pnpm db:push:local
pnpm db:push:preview
pnpm db:push:prod
```

Always inspect the interactive SQL diff. Apply and verify a change locally first, then apply it to
the Railway test and preview databases before production. Run a second push against each target to
confirm there is no remaining diff. A schema push and the compatible application deployment must be
coordinated; never assume a worktree change has already been deployed.

## Reset guards

Local, preview, and test resets fail closed unless the target database contains its exact guard
marker. Provisioning the marker is a one-time authorization for future destructive resets, so the
provisioning command requires the actual database name:

```bash
# The first attempt prints the database-specific confirmation string.
pnpm db:guard:local
pnpm db:guard:preview
pnpm db:guard:test

# Re-run only after checking the host and database name in the error.
pnpm db:guard:local -- --confirm="PROVISION LOCAL <database-name>"
pnpm db:guard:preview -- --confirm="PROVISION PREVIEW <database-name>"
pnpm db:guard:test -- --confirm="PROVISION TEST <database-name>"
```

The provisioner refuses to overwrite a different marker. Production guard provisioning and
production reset commands do not exist.

After provisioning, resets still require an exact typed confirmation. In an interactive terminal
the script prompts for it; automation must pass it explicitly:

```bash
pnpm db:reset:local -- --confirm="RESET LOCAL"
pnpm db:reset:preview -- --confirm="RESET PREVIEW"
pnpm --filter @discuno/web db:reset:test -- --confirm="RESET TEST"
```

Resets drop only `discuno_*` application objects. Cal.com accounts belong to mentors and are never
deleted. Optional external cleanup is limited to platform-owned Stripe test accounts, requires an
`sk_test_` key, and remains disabled unless explicitly enabled.

## Other commands

- `pnpm db:seed` seeds canonical reference and development data.
- `pnpm db:studio:<environment>` opens Drizzle Studio for a named environment.
- `pnpm db:test:<environment>` performs a read-only connection test.
- `pnpm integrations:check:<environment>` performs read-only integration readiness checks.
