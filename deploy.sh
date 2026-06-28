#!/bin/bash
set -e
cd /opt/chatcart

echo ""
echo "========================================"
echo "  Chatcart Deploy — $(date)"
echo "========================================"
echo ""

echo "[ 1/4 ] Pulling latest code from GitHub..."
git pull origin main
echo "        Done."
echo ""

echo "[ 2/4 ] Rebuilding API server..."
docker compose build api
echo "        Done."
echo ""

echo "[ 3/4 ] Restarting all services..."
docker compose up -d
echo "        Done."
echo ""

echo "[ 4/4 ] Fixing WhatsApp session permissions..."
chmod -R 777 docker-data/wa-session 2>/dev/null || true
echo "        Done."
echo ""

echo "========================================"
echo "  Deploy complete! Site is live."
echo "  https://chatcart.in"
echo "========================================"
echo ""
