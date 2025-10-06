# Git Hooks with Husky

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/) for maintaining code quality across the monorepo.

## Available Hooks

### 🔍 Pre-commit (`pre-commit`)

Runs before each commit to ensure code quality:

- **Lint-staged**: Automatically lints and formats only staged files
- **Type checking**: Runs TypeScript type checking across the entire monorepo
- **Fast execution**: Only processes files that are being committed

### 📝 Commit message (`commit-msg`)

Validates commit messages using conventional commit format:

- **Format validation**: Ensures commits follow conventional commit standards
- **Helpful feedback**: Provides examples when validation fails
- **Types supported**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 🚀 Pre-push (`pre-push`)

Runs comprehensive checks before pushing:

- **Test suite**: Runs all tests across the monorepo
- **Build verification**: Ensures the entire monorepo builds successfully
- **Prevents broken pushes**: Stops push if any checks fail

## Lint-staged Configuration

The root `package.json` contains lint-staged configuration for:

```json
{
  "lint-staged": {
    "apps/web/**/*.{ts,tsx,js,jsx,mdx}": [
      "pnpm --filter @discuno/web lint:fix",
      "pnpm --filter @discuno/web format:write"
    ],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

## CI/Production Setup

The `.husky/install.mjs` script automatically skips Husky installation in:

- Production environments (`NODE_ENV=production`)
- CI environments (`CI=true`)

This prevents unnecessary Git hook setup in deployment environments.

## Disabling Hooks

### Temporarily disable all hooks

```bash
HUSKY=0 git commit -m "skip hooks"
```

### Skip specific hooks

```bash
git commit -m "message" --no-verify  # Skip pre-commit and commit-msg
git push --no-verify                 # Skip pre-push
```

## Troubleshooting

### Hook execution fails

1. Ensure you're in the repository root
2. Check that dependencies are installed: `pnpm install`
3. Verify hook permissions: `chmod +x .husky/*`

### Type checking is slow

The pre-commit hook runs type checking across the entire monorepo. This ensures type safety but may take a moment on large codebases.

### Tests failing on pre-push

Fix failing tests before pushing, or use `git push --no-verify` to skip (not recommended for main branches).

## Best Practices

1. **Don't skip hooks** unless absolutely necessary
2. **Fix issues locally** before committing
3. **Use conventional commits** for clear project history
4. **Keep hooks fast** by only processing staged files when possible
5. **Coordinate with team** when making hook changes
