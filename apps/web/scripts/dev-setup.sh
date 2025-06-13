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
echo "2. Run 'pnpm db:push' to set up your database schema"
echo "3. Run 'pnpm dev' to start the development server"
echo ""
echo "Happy coding! 🚀"
