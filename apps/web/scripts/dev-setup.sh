#!/usr/bin/env bash

# Bootstrap the Discuno monorepo with the toolchain declared in package.json.

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$WEB_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🚀 Setting up the Discuno development environment..."

check_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "❌ $tool is not installed. Install it before continuing."
    exit 1
  fi
  echo "✅ $tool is installed"
}

version_at_least() {
  local actual="${1%%-*}"
  local required="${2%%-*}"
  local actual_major actual_minor actual_patch
  local required_major required_minor required_patch

  IFS=. read -r actual_major actual_minor actual_patch <<<"$actual"
  IFS=. read -r required_major required_minor required_patch <<<"$required"
  actual_minor="${actual_minor:-0}"
  actual_patch="${actual_patch:-0}"
  required_minor="${required_minor:-0}"
  required_patch="${required_patch:-0}"

  [[ "$actual_major$actual_minor$actual_patch$required_major$required_minor$required_patch" =~ ^[0-9]+$ ]] || return 1

  ((10#$actual_major > 10#$required_major)) ||
    ((10#$actual_major == 10#$required_major && 10#$actual_minor > 10#$required_minor)) ||
    ((10#$actual_major == 10#$required_major && 10#$actual_minor == 10#$required_minor && 10#$actual_patch >= 10#$required_patch))
}

echo "📋 Checking required tools..."
check_tool node
check_tool pnpm
check_tool git

node_version="$(node --version)"
node_version="${node_version#v}"
node_major="${node_version%%.*}"
if [[ "$node_major" != "24" ]]; then
  echo "❌ Node.js $node_version is unsupported. Discuno requires Node.js 24.x."
  exit 1
fi
echo "✅ Node.js $node_version matches the required 24.x release line"

pnpm_version="$(pnpm --version)"
if ! version_at_least "$pnpm_version" "11.13.0"; then
  echo "❌ pnpm $pnpm_version is unsupported. Discuno requires pnpm 11.13.0 or newer."
  exit 1
fi
echo "✅ pnpm $pnpm_version meets the 11.13.0 minimum"

echo "📦 Installing the reviewed dependency graph..."
pnpm install --frozen-lockfile

env_file="$WEB_DIR/.env.local"
env_template="$WEB_DIR/.env.example"
if [[ ! -f "$env_file" ]]; then
  if [[ -f "$env_template" ]]; then
    cp "$env_template" "$env_file"
    echo "📝 Created apps/web/.env.local from apps/web/.env.example"
    echo "🔧 Add your local credentials before starting the application"
  else
    echo "❌ apps/web/.env.example is missing. Create apps/web/.env.local manually."
  fi
else
  echo "✅ apps/web/.env.local exists"
fi

echo "🔍 Checking application types..."
pnpm typecheck

echo "🔍 Checking test types..."
pnpm typecheck:tests

echo "🧹 Running the linter..."
pnpm lint

echo
echo "🎉 Development environment setup complete!"
echo
echo "Next steps:"
echo "1. Review apps/web/.env.local and add your local credentials."
echo "2. Test database connectivity with 'pnpm db:test:local'."
echo "3. Review and apply the local schema with 'pnpm db:push:local'."
echo "4. Seed reference data with 'pnpm db:seed'."
echo "5. Check integrations with 'pnpm integrations:check:local'."
echo "6. Start the app with 'pnpm dev:web' (or all workspaces with 'pnpm dev')."
echo
echo "Destructive option: 'pnpm db:reset:local' resets the local database."
