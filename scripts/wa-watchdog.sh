#!/usr/bin/env bash
# wa-watchdog.sh — restart the docker compose stack if the API health-check fails.
#
# Run this as a cron job on the DigitalOcean droplet, for example every 5 minutes:
#   */5 * * * * /path/to/chatcart/scripts/wa-watchdog.sh >> /var/log/wa-watchdog.log 2>&1
#
# It checks the /api/healthz endpoint. If the request fails (connection refused,
# timeout, non-200, etc.) it restarts only the `api` container. If the API is
# healthy but WhatsApp has been disconnected for more than WARN_MINUTES, it logs
# a warning but does NOT restart (reconnect logic is handled inside the process).
# Only a complete API failure triggers a restart.

set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/healthz}"
WARN_MINUTES="${WARN_MINUTES:-10}"
TIMEOUT_SECS=10

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"
}

# ── Step 1: Check if the API responds ──────────────────────────────────────────
if ! response=$(curl -fsS --max-time "$TIMEOUT_SECS" "$HEALTH_URL" 2>&1); then
  log "ERROR: API health-check failed (curl exit $?). Response: $response"
  log "Restarting api container via docker compose…"
  cd "$COMPOSE_DIR"
  docker compose restart api
  log "Restart issued. Sleeping 15s before verifying…"
  sleep 15
  if curl -fsS --max-time "$TIMEOUT_SECS" "$HEALTH_URL" > /dev/null 2>&1; then
    log "API is back online after restart."
  else
    log "WARNING: API still not responding after restart. Manual intervention may be needed."
  fi
  exit 0
fi

log "API is healthy."

# ── Step 2: Check WhatsApp connection duration ─────────────────────────────────
wa_status=$(echo "$response" | grep -o '"status":"[^"]*"' | tail -1 | cut -d'"' -f4 || true)
disconnected_at=$(echo "$response" | grep -o '"disconnectedAt":"[^"]*"' | cut -d'"' -f4 || true)

if [ "$wa_status" = "disconnected" ] && [ -n "$disconnected_at" ]; then
  disconnected_epoch=$(date -d "$disconnected_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${disconnected_at%%.*}" +%s 2>/dev/null || echo 0)
  now_epoch=$(date +%s)
  elapsed_minutes=$(( (now_epoch - disconnected_epoch) / 60 ))

  if [ "$elapsed_minutes" -ge "$WARN_MINUTES" ]; then
    log "WARNING: WhatsApp has been disconnected for ${elapsed_minutes}m (threshold: ${WARN_MINUTES}m). The server is retrying automatically. Check the admin panel if this persists."
  else
    log "WhatsApp disconnected for ${elapsed_minutes}m — within tolerance, reconnect in progress."
  fi
else
  log "WhatsApp status: ${wa_status:-unknown}"
fi
