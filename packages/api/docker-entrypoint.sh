#!/bin/sh
set -e

echo "=== Geolyt API startup ==="

echo "[1] Running database migrations..."
cd /app/packages/db
bun src/migrate.ts
cd /app/packages/api
echo "[1] Migrations complete."

echo "=== Starting API server ==="
exec "$@"
