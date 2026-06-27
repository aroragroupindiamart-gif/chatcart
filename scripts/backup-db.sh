#!/usr/bin/env sh
# backup-db.sh — nightly Postgres backup to DigitalOcean Spaces
#
# Runs inside the `backup` Docker service defined in docker-compose.yml.
# Can also be executed manually from the Droplet:
#
#   docker compose exec backup /backup-db.sh
#
# Required environment variables (all present in the `backup` service):
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE
#   DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION, DO_SPACES_BUCKET
#
# Backups land at:  s3://<bucket>/backups/chatcart-YYYYMMDD-HHMMSS.sql.gz
# Retention:        last 7 days (older dumps are deleted automatically)

set -eu

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
DUMP_FILE="/tmp/chatcart-${TIMESTAMP}.sql"
COMPRESSED_FILE="${DUMP_FILE}.gz"
BACKUP_FILE="chatcart-${TIMESTAMP}.sql.gz"
S3_PREFIX="backups"
S3_URI="s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"
ENDPOINT_URL="https://${DO_SPACES_REGION}.digitaloceanspaces.com"
RETAIN_DAYS=7

echo "[backup] $(date -u '+%Y-%m-%d %H:%M:%S UTC') — starting backup"

# ── Cleanup temp files on exit (success or failure) ─────────────────────────
cleanup() {
  rm -f "${DUMP_FILE}" "${COMPRESSED_FILE}"
}
trap cleanup EXIT

# ── 1. Dump to a plain file first (avoids pipeline masking exit codes) ───────
pg_dump \
  --host="${PGHOST}" \
  --username="${PGUSER}" \
  --dbname="${PGDATABASE}" \
  --no-password \
  --format=plain \
  > "${DUMP_FILE}"

# pg_dump succeeded — verify the dump is non-empty before continuing
if [ ! -s "${DUMP_FILE}" ]; then
  echo "[backup] ERROR: pg_dump produced an empty file — aborting" >&2
  exit 1
fi

echo "[backup] dump complete: $(du -sh "${DUMP_FILE}" | cut -f1) uncompressed"

# ── 2. Compress ──────────────────────────────────────────────────────────────
gzip -9 -c "${DUMP_FILE}" > "${COMPRESSED_FILE}"
rm -f "${DUMP_FILE}"

COMPRESSED_SIZE="$(du -sh "${COMPRESSED_FILE}" | cut -f1)"
echo "[backup] compressed: ${COMPRESSED_SIZE} → ${BACKUP_FILE}"

# ── 3. Upload to DO Spaces ───────────────────────────────────────────────────
aws s3 cp "${COMPRESSED_FILE}" "${S3_URI}" \
  --endpoint-url="${ENDPOINT_URL}" \
  --storage-class=STANDARD \
  --no-progress

echo "[backup] uploaded to ${S3_URI}"

# ── 4. Prune backups older than RETAIN_DAYS days ────────────────────────────
CUTOFF="$(date -u -d "${RETAIN_DAYS} days ago" '+%Y-%m-%dT%H:%M:%S')"

echo "[backup] pruning backups older than ${RETAIN_DAYS} days (before ${CUTOFF} UTC)"

aws s3 ls "s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/" \
  --endpoint-url="${ENDPOINT_URL}" \
  | while read -r LINE; do
      FILE_DATE="$(echo "${LINE}" | awk '{print $1"T"$2}')"
      FILE_NAME="$(echo "${LINE}" | awk '{print $4}')"
      if [ -n "${FILE_NAME}" ] && [ "${FILE_DATE}" \< "${CUTOFF}" ]; then
        aws s3 rm "s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/${FILE_NAME}" \
          --endpoint-url="${ENDPOINT_URL}"
        echo "[backup] deleted old backup: ${FILE_NAME}"
      fi
    done

echo "[backup] $(date -u '+%Y-%m-%d %H:%M:%S UTC') — done"
