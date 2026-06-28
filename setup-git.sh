#!/bin/bash
# One-time setup: connects this Droplet to GitHub so deploy.sh can pull updates.
# Run this once, then use ./deploy.sh for all future deploys.

set -e
cd /opt/chatcart

echo ""
echo "=== Chatcart GitHub Setup ==="
echo ""
echo "You need your GitHub Personal Access Token to continue."
echo "(Starts with ghp_ — create one at github.com → Settings → Developer settings)"
echo ""
read -rp "Paste your GitHub token: " GITHUB_TOKEN
echo ""

GITHUB_REPO="aroragroupindiamart-gif/chatcart"

echo "[ 1/4 ] Initialising git..."
git init -b main 2>/dev/null || git checkout -b main 2>/dev/null || true
git config user.email "deploy@chatcart.in"
git config user.name "Chatcart Deploy"
echo "        Done."
echo ""

echo "[ 2/4 ] Storing credentials securely..."
git config credential.helper store
printf "https://%s:x-oauth-basic@github.com\n" "$GITHUB_TOKEN" > ~/.git-credentials
chmod 600 ~/.git-credentials
echo "        Done."
echo ""

echo "[ 3/4 ] Connecting to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${GITHUB_REPO}.git"
echo "        Done."
echo ""

echo "[ 4/4 ] Syncing with GitHub (your .env and docker-data are safe — they are gitignored)..."
git fetch origin main
# Hard reset to exactly match GitHub. .env and docker-data/ are gitignored so
# git never touches them. All other files are overwritten to match GitHub.
git reset --hard FETCH_HEAD
git branch --set-upstream-to=origin/main main 2>/dev/null || true
echo "        Done."
echo ""

echo "=== Setup complete! ==="
echo "Run ./deploy.sh whenever updates are ready."
echo ""
