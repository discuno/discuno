# Contributing to Discuno

Thank you for your interest in contributing to Discuno! We welcome contributions from everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/discuno.git
   cd discuno
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Start development servers**:

   ```bash
   pnpm dev
   ```

5. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Making Changes

### Development Workflow

1. **Make your changes** in your feature branch
2. **Test your changes**:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

3. **Build to ensure everything works**:

   ```bash
   pnpm build
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Examples:

- `feat: add user authentication`
- `fix: resolve calendar sync issue`
- `docs: update installation guide`
- `refactor: simplify booking logic`
- `test: add unit tests for components`

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all checks pass**:

   - All tests pass
   - No linting errors
   - TypeScript compiles without errors
   - Builds successfully

4. **Create a Pull Request** with:

   - Clear title and description
   - Reference any related issues
   - Screenshots for UI changes
   - Breaking change notes if applicable

5. **Address review feedback** promptly

### PR Requirements

- [ ] Tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Builds successfully (`pnpm build`)
- [ ] Documentation updated if needed
- [ ] Follows coding standards

## Coding Standards

### General Guidelines

- **TypeScript First**: All code should be written in TypeScript
- **Functional Components**: Use React functional components with hooks
- **Server Components**: Prefer Next.js server components when possible
- **Composition**: Favor composition over inheritance

### File Organization

```
apps/web/src/
├── app/                    # Next.js app router pages
├── components/             # React components
│   ├── ui/                 # Base UI components
│   └── shared/             # Shared business components
├── lib/                    # Utilities and configurations
└── server/                 # Server-side code

packages/discuno-atoms/src/
├── components/             # Reusable components
├── hooks/                  # Custom hooks
├── lib/                    # Utilities
└── types/                  # Type definitions
```

### Code Style

- **Formatting**: Use Prettier (run `pnpm format`)
- **Linting**: Follow ESLint rules (run `pnpm lint`)
- **Naming**: Use descriptive, camelCase names
- **Components**: Use PascalCase for component names
- **Files**: Use kebab-case for file names

### TypeScript

- Always provide explicit types for function parameters and return values
- Use strict mode (`"strict": true`)
- Avoid `any` type - use specific types or `unknown`
- Export types alongside implementation

## Project Structure

This is a monorepo with the following packages:

- **`@discuno/web`**: Main Next.js application
- **`@discuno/atoms`**: Shared component library

### Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Database**: Drizzle ORM
- **Build**: Turbo, tsup
- **Testing**: Vitest, Testing Library

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Writing Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows (if applicable)

Place test files next to the code they test with `.test.ts` or `.spec.ts` extension.

## Documentation

### When to Update Documentation

- Adding new features
- Changing existing APIs
- Adding new configuration options
- Fixing bugs that affect documented behavior

### Documentation Types

- **README**: Overview and getting started
- **API Docs**: Component and function documentation
- **Examples**: Usage examples and tutorials
- **Comments**: Inline code documentation

## Getting Help

- **Issues**: Check existing [GitHub Issues](https://github.com/discuno/discuno/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/discuno/discuno/discussions) for questions
- **Discord**: Join our community server (link in README)

## Recognition

Contributors will be recognized in our README and release notes. Thank you for making Discuno better! 🎉
