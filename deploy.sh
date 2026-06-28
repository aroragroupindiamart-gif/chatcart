#!/bin/bash
set -e
cd /opt/chatcart

echo ""
echo "========================================"
echo "  Chatcart Deploy — $(date)"
echo "========================================"
echo ""

echo "[ 1/5 ] Pulling latest code from GitHub..."
git pull origin main
echo "        Done."
echo ""

echo "[ 2/5 ] Rebuilding API server..."
docker compose build api
echo "        Done."
echo ""

echo "[ 3/5 ] Restarting all services..."
docker compose up -d
echo "        Done."
echo ""

echo "[ 4/5 ] Reloading nginx config..."
docker compose exec -T nginx nginx -s reload 2>/dev/null || docker compose restart nginx
echo "        Done."
echo ""

echo "[ 5/5 ] Fixing WhatsApp session permissions..."
chmod -R 777 docker-data/wa-session 2>/dev/null || true
echo "        Done."
echo ""

echo "========================================"
echo "  Deploy complete! Site is live."
echo "  https://chatcart.in"
echo "========================================"
echo ""
