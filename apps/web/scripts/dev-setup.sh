#!/bin/bash

# Discuno Web App Development Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Setting up Discuno Web App development environment..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking required tools..."
check_tool "node"
check_tool "pnpm"
check_tool "git"

# Check Node.js version
node_version=$(node --version | cut -d'v' -f2)
required_version="18.0.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Node.js version $node_version is below required version $required_version"
    exit 1
else
    echo "✅ Node.js version $node_version meets requirements"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Check for environment file
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "📝 Created .env.local from .env.example"
        echo "🔧 Please edit .env.local with your configuration"
    else
        echo "❌ .env.example not found. Please create .env.local manually"
    fi
else
    echo "✅ .env.local exists"
fi

# Run type checking
echo "🔍 Running type check..."
pnpm typecheck

# Run linting
echo "🧹 Running linter..."
pnpm lint

# Setup git hooks
echo "🪝 Setting up git hooks..."
npx husky install

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your database and API credentials"
echo "2. Test your database connection with 'pnpm db:test:local'"
echo "3. Set up your database with 'pnpm db:reset:local' (includes schema and seed data)"
echo "4. Run 'pnpm dev' to start the development server"
echo ""
echo "Available database commands:"
echo "  - pnpm db:test:local              # Test database connection"
echo "  - pnpm db:reset:local             # Reset database with fresh data"
echo "  - pnpm db:seed local              # Add seed data to existing database"
echo "  - pnpm db:push local              # Push local schema to database"
echo "  - pnpm db:generate:local         # Generate TypeScript definitions from local schema"
echo ""
echo "Happy coding! 🚀"
