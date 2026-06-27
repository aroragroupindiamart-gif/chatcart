#!/usr/bin/env sh
# restore-backup.sh — restore a Postgres backup from DigitalOcean Spaces
#
# Usage (run from the Droplet inside /opt/chatcart):
#
#   bash scripts/restore-backup.sh <backup-filename>
#
# Example:
#   bash scripts/restore-backup.sh chatcart-20260627-020000.sql.gz
#
# If no filename is given the script lists available backups and exits.
#
# ⚠ WARNING: This DROPS and RECREATES the chatcart database.
#   All current data will be permanently replaced by the backup.
#   Stop the API container first to prevent new writes during restore.
#
# Required: DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION,
#           DO_SPACES_BUCKET, POSTGRES_PASSWORD in the environment or .env

set -eu

# ── Load .env if available (host-side restore) ───────────────────────────────
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

ENDPOINT_URL="https://${DO_SPACES_REGION}.digitaloceanspaces.com"
S3_PREFIX="backups"

# ── No argument: list available backups ─────────────────────────────────────
if [ $# -eq 0 ]; then
  echo "Available backups in s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/:"
  echo ""
  AWS_ACCESS_KEY_ID="${DO_SPACES_KEY}" \
  AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET}" \
  aws s3 ls "s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/" \
    --endpoint-url="${ENDPOINT_URL}"
  echo ""
  echo "Usage: bash scripts/restore-backup.sh <filename>"
  echo "  e.g. bash scripts/restore-backup.sh chatcart-20260627-020000.sql.gz"
  exit 0
fi

BACKUP_FILE="$1"
S3_URI="s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"
LOCAL_FILE="/tmp/${BACKUP_FILE}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  CHATCART DATABASE RESTORE                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Source : ${S3_URI}"
echo "  Target : chatcart database on localhost (Docker Postgres)"
echo ""
echo "  ⚠  WARNING: All current data will be PERMANENTLY REPLACED."
echo ""
printf "  Type 'yes' to continue: "
read CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# ── Ensure API is restarted even if the restore fails partway through ────────
_api_stopped=0
cleanup_restore() {
  if [ "${_api_stopped}" = "1" ]; then
    echo ""
    echo "[restore] Restarting API container (cleanup)..."
    docker compose start api || true
  fi
  rm -f "${LOCAL_FILE}"
}
trap cleanup_restore EXIT

# ── Step 1: Stop the API to prevent writes during restore ───────────────────
echo ""
echo "[restore] Stopping API container..."
docker compose stop api
_api_stopped=1

# ── Step 2: Download backup from DO Spaces ──────────────────────────────────
echo "[restore] Downloading ${BACKUP_FILE} from DO Spaces..."
AWS_ACCESS_KEY_ID="${DO_SPACES_KEY}" \
AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET}" \
aws s3 cp "${S3_URI}" "${LOCAL_FILE}" \
  --endpoint-url="${ENDPOINT_URL}" \
  --no-progress

echo "[restore] Download complete: $(du -sh "${LOCAL_FILE}" | cut -f1)"

# ── Step 3: Drop and recreate the database ───────────────────────────────────
echo "[restore] Dropping and recreating the chatcart database..."
docker compose exec -T postgres \
  psql -U chatcart -d postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'chatcart' AND pid <> pg_backend_pid();
    DROP DATABASE IF EXISTS chatcart;
    CREATE DATABASE chatcart OWNER chatcart;
  "

# ── Step 4: Restore the dump ─────────────────────────────────────────────────
echo "[restore] Restoring database from backup..."
gunzip -c "${LOCAL_FILE}" \
  | docker compose exec -T postgres \
      psql -U chatcart -d chatcart

echo "[restore] Restore complete."

# ── Step 5: Verify tables exist ──────────────────────────────────────────────
echo ""
echo "[restore] Tables present after restore:"
docker compose exec -T postgres \
  psql -U chatcart -d chatcart -c "\dt"

echo ""
echo "[restore] Done. The database has been restored from ${BACKUP_FILE}."
echo "          Monitor the API logs: docker compose logs api -f"
# Cleanup trap (see top of script) will restart the API and remove the temp file.
