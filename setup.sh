#!/usr/bin/env bash
# First-time local setup for Social Digests.
# Run once from the project root: bash setup.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "▶ Social Digests — local setup"
echo ""

# ── 1. Remove root-owned node_modules (created by earlier Docker run) ──────
for dir in backend cms; do
  NM="$ROOT/$dir/node_modules"
  if [ -d "$NM" ] && [ "$(stat -c '%U' "$NM")" = "root" ]; then
    echo "  Removing root-owned $dir/node_modules (needs sudo)…"
    sudo rm -rf "$NM"
  fi
done

# ── 2. Install dependencies ─────────────────────────────────────────────────
for dir in frontend backend cms; do
  echo ""
  echo "  npm install → $dir/"
  (cd "$ROOT/$dir" && npm install --loglevel=error)
done

# ── 3. Copy .env.example → .env if .env doesn't exist ──────────────────────
echo ""
for dir in frontend backend cms; do
  ENV="$ROOT/$dir/.env"
  EXAMPLE="$ROOT/$dir/.env.example"
  if [ ! -f "$ENV" ] && [ -f "$EXAMPLE" ]; then
    cp "$EXAMPLE" "$ENV"
    echo "  Created $dir/.env from .env.example"
  else
    echo "  $dir/.env already exists — skipping"
  fi
done

# ── 4. Run database migration (requires PostgreSQL to be running) ───────────
echo ""
echo "  To run the database migration once Postgres is up:"
echo "    psql \$DATABASE_URL -f backend/db/migrations/001_initial.sql"

echo ""
echo "✓ Setup complete. Start everything with:"
echo ""
echo "    docker compose up          # all services via Docker"
echo ""
echo "  Or run services individually:"
echo "    cd frontend && npm run dev"
echo "    cd backend  && npm run dev"
echo "    cd cms      && npm run develop"
echo ""
