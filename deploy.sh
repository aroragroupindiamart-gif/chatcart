#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  Chatcart Deploy — $(date)"
echo "========================================"
echo ""

echo "[ 1/6 ] Pulling latest code from GitHub..."
git pull origin main
echo "        Done."
echo ""

echo "[ 2/6 ] Building frontend assets..."
docker run --rm \
  -e CI=true \
  -v "$(pwd)":/workspace \
  -w /workspace \
  node:20-slim sh -c "
    corepack enable && corepack prepare pnpm@10.26.1 --activate &&
    pnpm install --frozen-lockfile &&
    pnpm --filter @workspace/api-server run build &&
    PORT=3000 BASE_PATH='/' NODE_ENV=production pnpm --filter @workspace/chatcart-marketing run build &&
    PORT=3001 BASE_PATH='/admin/' NODE_ENV=production pnpm --filter @workspace/chatcart-admin run build &&
    PORT=3002 BASE_PATH='/store/' NODE_ENV=production pnpm --filter @workspace/chatcart-store run build &&
    PORT=3003 BASE_PATH='/app/' NODE_ENV=production pnpm --filter @workspace/chatcart-web run build
  "
echo "        Done."
echo ""

echo "[ 3/6 ] Rebuilding API server..."
docker compose build api
echo "        Done."
echo ""

echo "[ 4/6 ] Restarting all services..."
docker compose up -d
echo "        Done."
echo ""

echo "[ 5/6 ] Reloading nginx config..."
docker compose exec -T nginx nginx -s reload 2>/dev/null || docker compose restart nginx
echo "        Done."
echo ""

echo "Sleeping for 8 seconds to allow containers to boot up..."
sleep 8

echo "[ 6/7 ] Verifying live system health..."
if ! docker run --rm --net=host -v "$(pwd)":/workspace -w /workspace node:20-slim node scripts/verify_system.mjs https://chatcart.in; then
  echo "❌ LIVE SYSTEM VERIFICATION FAILED! Rolling back deployment immediately..."
  git reset --hard HEAD@{1}
  docker compose up -d
  docker compose exec -T nginx nginx -s reload
  echo "⏪ Rollback complete. Production has been restored to the previous version."
  exit 1
fi
echo "        Done. All live checks passed."
echo ""

echo "[ 7/7 ] Fixing WhatsApp session permissions..."
chmod -R 777 docker-data/wa-session 2>/dev/null || true
echo "        Done."
echo ""

echo "========================================"
echo "  Deploy complete! Site is live."
echo "  https://chatcart.in"
echo "========================================"
echo ""
