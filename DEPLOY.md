# How to Deploy Chatcart Updates

## When to deploy
After your Replit agent makes changes, every change is automatically saved to GitHub. Once you're happy with the changes, run the deploy command on the Droplet to push them live.

## What you need
- SSH access to the Droplet: `ssh root@206.189.202.35`

## The deploy command (run this every time)

```bash
./deploy.sh
```

That's it. It takes about 2–3 minutes and will print progress updates.

## First-time setup (run once only)

If this is the first time deploying from this Droplet, run the setup script first:

```bash
./setup-git.sh
```

This connects the Droplet to GitHub so it can pull updates. You only need to do this once.

## What the deploy does (for reference)
1. Pulls the latest code from GitHub
2. Rebuilds the API server Docker image
3. Restarts all services (nginx, API, database backup)
4. Fixes WhatsApp session permissions so WA stays connected

## After deploying
- Site: https://chatcart.in
- Admin: https://chatcart.in/admin/
- WhatsApp reconnects automatically (session is preserved)

## Troubleshooting
If something goes wrong during deploy, the OLD version keeps running — you won't have downtime from a failed build.

To check logs after deploying:
```bash
docker logs chatcart-api-1 --tail 20
```
