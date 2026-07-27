#!/usr/bin/env bash
# Setup script for the Codex Cloud environment. Point the environment's setup
# script field at:
#
#   bash .github/codex/setup.sh
#
# Codex Cloud grants network access during setup and withdraws it for the agent
# phase, so every download the agent would otherwise attempt happens here.
set -euo pipefail

# Node 22 matches .github/workflows/ci.yml. The unit and guard suites are .mjs
# files importing .ts directly, which needs native type stripping (>= 22.6);
# Node 20 cannot load them at all.
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm install 22
  nvm alias default 22
  nvm use 22
fi
node --version

npm ci --no-audit --no-fund

# Playwright downloads browsers from a CDN the agent phase cannot reach.
npx playwright install --with-deps chromium

# Supabase CLI, for authoring work only: `migration new`, `db diff`, `gen types`,
# and inspecting config. `supabase start` cannot work here — the sandbox blocks
# the Docker daemon at the kernel level (openai/codex-universal#19) — so the
# disposable stack stays a CI-only capability. A download failure is not fatal.
if ! command -v supabase >/dev/null 2>&1; then
  case "$(uname -m)" in
    x86_64) supabase_arch=amd64 ;;
    aarch64 | arm64) supabase_arch=arm64 ;;
    *) supabase_arch="" ;;
  esac
  if [ -n "$supabase_arch" ]; then
    supabase_tmp="$(mktemp -d)"
    if curl -fsSL --retry 3 \
      "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${supabase_arch}.tar.gz" \
      | tar -xz -C "$supabase_tmp" supabase; then
      install -m 0755 "$supabase_tmp/supabase" /usr/local/bin/supabase
    else
      echo "warning: Supabase CLI download failed; continuing without it" >&2
    fi
    rm -rf "$supabase_tmp"
  fi
fi

# next/font/google fetches font files at build time. One build here populates
# the font and compile caches while the network is still open. These are the
# same placeholder values ci.yml uses; none is a secret.
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}" \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-ci-public-placeholder}" \
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-ci-server-placeholder}" \
PORTAL_BASE_URL="${PORTAL_BASE_URL:-http://127.0.0.1:3100}" \
  npm run build
