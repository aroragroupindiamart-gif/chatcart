#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "==> Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "==> Building chatcart-marketing (base path: /)..."
PORT=3000 BASE_PATH="/" NODE_ENV=production \
  pnpm --filter @workspace/chatcart-marketing run build

echo "==> Building chatcart-admin (base path: /admin/)..."
PORT=3001 BASE_PATH="/admin/" NODE_ENV=production \
  pnpm --filter @workspace/chatcart-admin run build

echo "==> Building chatcart-store (base path: /store/)..."
PORT=3002 BASE_PATH="/store/" NODE_ENV=production \
  pnpm --filter @workspace/chatcart-store run build

echo "==> Building chatcart-web (base path: /dashboard/)..."
PORT=3003 BASE_PATH="/dashboard/" NODE_ENV=production \
  pnpm --filter @workspace/chatcart-web run build

echo ""
echo "All frontends built successfully."
echo "  artifacts/chatcart-marketing/dist/public/"
echo "  artifacts/chatcart-admin/dist/public/"
echo "  artifacts/chatcart-store/dist/public/"
echo "  artifacts/chatcart-web/dist/public/"
