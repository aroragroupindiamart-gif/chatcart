#!/usr/bin/env sh
# test-backup-restore.sh — verify the latest backup from DO Spaces actually restores
#
# Usage:
#   bash scripts/test-backup-restore.sh
#
# What it does:
#   1. Lists available backups and selects the most recent one
#   2. Downloads it to /tmp
#   3. Starts a throw-away Postgres 16 container
#   4. Restores the dump into the ephemeral container
#   5. Runs \dt and row-count sanity checks on critical tables
#   6. Destroys the container and removes the temp file
#
# Exit codes:
#   0 — restore verified successfully
#   1 — restore or sanity check failed
#
# Required environment variables:
#   DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION, DO_SPACES_BUCKET
#
# Optional:
#   BACKUP_FILE — override which file to test (default: most recent)

set -eu

# ── Load .env if present (host-side execution) ───────────────────────────────
if [ -f ".env" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

ENDPOINT_URL="https://${DO_SPACES_REGION}.digitaloceanspaces.com"
S3_PREFIX="backups"
TEST_CONTAINER="chatcart-restore-test-$$"
TEST_DB="chatcart_test"
TEST_USER="chatcart"
TEST_PASSWORD="test_restore_only"
TEST_PORT="54399"   # high port, unlikely to conflict

# ── Resolve which backup to test ─────────────────────────────────────────────
if [ -n "${BACKUP_FILE:-}" ]; then
  echo "[test-restore] Using specified backup: ${BACKUP_FILE}"
else
  echo "[test-restore] Discovering most recent backup in s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/ ..."
  BACKUP_FILE="$(
    AWS_ACCESS_KEY_ID="${DO_SPACES_KEY}" \
    AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET}" \
    aws s3 ls "s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/" \
      --endpoint-url="${ENDPOINT_URL}" \
      | sort -k1,2 \
      | tail -n1 \
      | awk '{print $4}'
  )"

  if [ -z "${BACKUP_FILE}" ]; then
    echo "[test-restore] ERROR: No backups found in s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/" >&2
    exit 1
  fi

  echo "[test-restore] Latest backup: ${BACKUP_FILE}"
fi

LOCAL_FILE="/tmp/${BACKUP_FILE}"
S3_URI="s3://${DO_SPACES_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"

# ── Cleanup: remove container and temp file on exit (success or failure) ─────
_container_started=0
cleanup() {
  if [ "${_container_started}" = "1" ]; then
    echo "[test-restore] Removing ephemeral container ${TEST_CONTAINER} ..."
    docker rm -f "${TEST_CONTAINER}" > /dev/null 2>&1 || true
  fi
  rm -f "${LOCAL_FILE}"
  echo "[test-restore] Cleanup complete."
}
trap cleanup EXIT

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  CHATCART BACKUP RESTORE TEST                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Backup : ${S3_URI}"
echo "  Target : ephemeral container ${TEST_CONTAINER} (port ${TEST_PORT})"
echo "  DB     : ${TEST_DB}"
echo ""

# ── Step 1: Download backup ───────────────────────────────────────────────────
echo "[test-restore] Downloading ${BACKUP_FILE} ..."
AWS_ACCESS_KEY_ID="${DO_SPACES_KEY}" \
AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET}" \
aws s3 cp "${S3_URI}" "${LOCAL_FILE}" \
  --endpoint-url="${ENDPOINT_URL}" \
  --no-progress

echo "[test-restore] Downloaded: $(du -sh "${LOCAL_FILE}" | cut -f1)"

# ── Step 2: Start ephemeral Postgres container ────────────────────────────────
echo "[test-restore] Starting ephemeral Postgres container ..."
docker run -d \
  --name "${TEST_CONTAINER}" \
  -e "POSTGRES_USER=${TEST_USER}" \
  -e "POSTGRES_PASSWORD=${TEST_PASSWORD}" \
  -e "POSTGRES_DB=${TEST_DB}" \
  -p "${TEST_PORT}:5432" \
  postgres:16-alpine \
  > /dev/null
_container_started=1

# Wait for Postgres to be ready (up to 30 s)
echo "[test-restore] Waiting for Postgres to be ready ..."
READY=0
for i in $(seq 1 30); do
  if docker exec "${TEST_CONTAINER}" \
      pg_isready -U "${TEST_USER}" -d "${TEST_DB}" -q 2>/dev/null; then
    READY=1
    break
  fi
  sleep 1
done

if [ "${READY}" = "0" ]; then
  echo "[test-restore] ERROR: Postgres container did not become ready within 30 s" >&2
  exit 1
fi

echo "[test-restore] Postgres is ready."

# ── Step 3: Restore the dump ──────────────────────────────────────────────────
echo "[test-restore] Restoring dump ..."
gunzip -c "${LOCAL_FILE}" \
  | docker exec -i "${TEST_CONTAINER}" \
      psql -U "${TEST_USER}" -d "${TEST_DB}" -q

echo "[test-restore] Restore command finished."

# ── Step 4: Verify tables exist (\dt) ────────────────────────────────────────
echo ""
echo "[test-restore] Tables present after restore:"
TABLE_LIST="$(
  docker exec "${TEST_CONTAINER}" \
    psql -U "${TEST_USER}" -d "${TEST_DB}" -c "\dt" 2>&1
)"
echo "${TABLE_LIST}"

# Count how many tables were restored
TABLE_COUNT="$(
  docker exec "${TEST_CONTAINER}" \
    psql -U "${TEST_USER}" -d "${TEST_DB}" -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
)"

echo ""
echo "[test-restore] Total public tables restored: ${TABLE_COUNT}"

if [ "${TABLE_COUNT:-0}" -lt 1 ]; then
  echo "[test-restore] ERROR: No tables found after restore — dump may be corrupt or empty" >&2
  exit 1
fi

# ── Step 5: Sanity-check critical tables ─────────────────────────────────────
echo ""
echo "[test-restore] Running row-count sanity checks on critical tables ..."

FAILED=0

check_table() {
  TABLE_NAME="$1"
  MIN_ROWS="${2:-0}"

  EXISTS="$(
    docker exec "${TEST_CONTAINER}" \
      psql -U "${TEST_USER}" -d "${TEST_DB}" -tAc \
      "SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = '${TABLE_NAME}';"
  )"

  if [ "${EXISTS}" = "0" ]; then
    echo "[test-restore]   FAIL  table '${TABLE_NAME}' does not exist" >&2
    FAILED=1
    return
  fi

  ROW_COUNT="$(
    docker exec "${TEST_CONTAINER}" \
      psql -U "${TEST_USER}" -d "${TEST_DB}" -tAc \
      "SELECT COUNT(*) FROM ${TABLE_NAME};"
  )"

  if [ "${ROW_COUNT:-0}" -lt "${MIN_ROWS}" ]; then
    echo "[test-restore]   FAIL  table '${TABLE_NAME}' has ${ROW_COUNT} rows (expected >= ${MIN_ROWS})" >&2
    FAILED=1
  else
    echo "[test-restore]   OK    table '${TABLE_NAME}': ${ROW_COUNT} rows"
  fi
}

# Core tables — must exist after restore (min 0 rows each; we verify table presence)
check_table "sellers"            0
check_table "products"           0
check_table "categories"         0
check_table "orders"             0
check_table "order_items"        0
check_table "contact_submissions" 0
check_table "admin_users"        0

echo ""
if [ "${FAILED}" = "1" ]; then
  echo "[test-restore] RESULT: FAILED — one or more sanity checks did not pass" >&2
  exit 1
fi

echo "[test-restore] RESULT: SUCCESS — backup restored and verified cleanly ✓"
echo ""
echo "  Backup file : ${BACKUP_FILE}"
echo "  Tables found: ${TABLE_COUNT}"
echo ""
# Cleanup trap runs next (container removal + temp file deletion)
