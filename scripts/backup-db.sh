#!/usr/bin/env sh
# backup-db.sh — nightly Postgres + image-file backup to DigitalOcean Spaces
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
# What this script backs up:
#   1. Postgres database  → s3://<bucket>/backups/chatcart-YYYYMMDD-HHMMSS.sql.gz
#                           Kept for RETAIN_DAYS days, older dumps deleted automatically.
#   2. Image files        → s3://<bucket>/image-backup/  (rolling mirror, single copy)
#                           A live sync of every uploaded file, excluding the backups/
#                           and image-backup/ prefixes. --delete keeps it in sync with
#                           object deletions. Protects against accidental object deletion.
#                           NOTE: this is a same-bucket mirror — it does NOT protect
#                           against full bucket deletion. For bucket-level protection,
#                           enable DO Spaces versioning via the control panel.

set -eu

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
DUMP_FILE="/tmp/chatcart-${TIMESTAMP}.sql"
COMPRESSED_FILE="${DUMP_FILE}.gz"
BACKUP_FILE="chatcart-${TIMESTAMP}.sql.gz"
S3_PREFIX="backups"
S3_URI="s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"
ENDPOINT_URL="https://${DO_SPACES_REGION}.digitaloceanspaces.com"
RETAIN_DAYS=30

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

# ── 4. Prune DB backups older than RETAIN_DAYS days ─────────────────────────
CUTOFF="$(date -u -d "${RETAIN_DAYS} days ago" '+%Y-%m-%dT%H:%M:%S')"

echo "[backup] pruning DB backups older than ${RETAIN_DAYS} days (before ${CUTOFF} UTC)"

aws s3 ls "s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/" \
  --endpoint-url="${ENDPOINT_URL}" \
  | while read -r LINE; do
      FILE_DATE="$(echo "${LINE}" | awk '{print $1"T"$2}')"
      FILE_NAME="$(echo "${LINE}" | awk '{print $4}')"
      if [ -n "${FILE_NAME}" ] && [ "${FILE_DATE}" \< "${CUTOFF}" ]; then
        aws s3 rm "s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/${FILE_NAME}" \
          --endpoint-url="${ENDPOINT_URL}"
        echo "[backup] deleted old DB backup: ${FILE_NAME}"
      fi
    done

echo "[backup] DB backup complete"

# ── 5. Mirror image files into image-backup/ ─────────────────────────────────
# Syncs all uploaded product images to a separate prefix in the same bucket.
# --delete keeps the mirror consistent when images are deleted in the live store.
# This is a rolling single-copy mirror (not versioned), so storage cost is
# approximately 2x current image storage — not 30x.
echo "[backup] syncing image files to image-backup/ mirror…"

aws s3 sync \
  "s3://${DO_SPACES_BUCKET}/" \
  "s3://${DO_SPACES_BUCKET}/image-backup/" \
  --endpoint-url="${ENDPOINT_URL}" \
  --exclude "backups/*" \
  --exclude "image-backup/*" \
  --delete \
  --no-progress

echo "[backup] image mirror sync complete"
echo "[backup] $(date -u '+%Y-%m-%d %H:%M:%S UTC') — all done"
