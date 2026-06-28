---
name: DO Droplet deploy pipeline
description: How code changes in Replit get deployed to the DigitalOcean Droplet at chatcart.in
---

## Setup
- `deploy.sh` — run on Droplet each time to deploy; pulls from GitHub, rebuilds Docker API image, restarts, fixes wa-session perms
- `setup-git.sh` — run once to initialise git on Droplet and link to GitHub; prompts for token interactively (no hardcoded secrets)
- Both files committed to repo root and pushed to GitHub

## Frontend build strategy
- All 4 frontends built in Replit and their `dist/public/` committed to git (excluded from .gitignore via exceptions)
- BASE_PATH env vars required at build time: admin=/admin/, store=/store/, dashboard=/dashboard/, marketing=/
- PORT env var also required (any value, e.g. 3000) — only used by Vite dev server, not build output
- Build command: `PORT=3000 BASE_PATH=/admin/ pnpm --filter @workspace/chatcart-admin run build`

## Deploy flow
1. Agent makes changes in Replit → Replit auto-commits to GitHub on every checkpoint
2. User SSHes to Droplet: `ssh root@206.189.202.35`
3. User runs: `./deploy.sh` (takes ~2-3 min)

## WA session permissions
- After any Docker restart, `chmod -R 777 /opt/chatcart/docker-data/wa-session` is required
- Container runs as `chatcart` Alpine system user (not uid 1000) — must use 777 not chown 1000:1000
- deploy.sh handles this automatically

**Why:** wa-session dir gets root ownership when Docker mounts it fresh; Baileys crashes with EACCES on creds.json save, which surfaces as "check your phone connection" on the scanning phone.
