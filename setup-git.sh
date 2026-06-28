#!/bin/bash
# One-time setup: connects this Droplet to GitHub so deploy.sh can pull updates.
# Run this once, then use ./deploy.sh for all future deploys.

set -e
cd /opt/chatcart

echo ""
echo "=== Chatcart GitHub Setup ==="
echo ""
echo "You need your GitHub Personal Access Token to continue."
echo "(This is the token you created on github.com — starts with ghp_)"
echo ""
read -rp "Paste your GitHub token: " GITHUB_TOKEN
echo ""

GITHUB_REPO="aroragroupindiamart-gif/chatcart"

echo "[ 1/3 ] Initialising git..."
git init -b main 2>/dev/null || git init
git config user.email "deploy@chatcart.in"
git config user.name "Chatcart Deploy"
echo "        Done."
echo ""

echo "[ 2/3 ] Connecting to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"
echo "        Done."
echo ""

echo "[ 3/3 ] Syncing with GitHub (your .env and docker-data are safe)..."
git fetch origin main
# Reset tracking without touching working files (.env, docker-data, certs)
git reset origin/main
echo "        Done."
echo ""

echo "=== Setup complete! ==="
echo "From now on, run ./deploy.sh whenever updates are ready."
echo ""
