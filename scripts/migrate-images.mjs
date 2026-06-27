#!/usr/bin/env node
/**
 * migrate-images.mjs
 *
 * Downloads all product images from the live Replit API and uploads them to
 * DigitalOcean Spaces. Run this ONCE after Spaces is set up, before DNS cutover.
 *
 * Usage:
 *   node scripts/migrate-images.mjs
 *
 * Required env vars (same as the .env file on the Droplet):
 *   DATABASE_URL        — local Postgres connection string
 *   DO_SPACES_KEY       — Spaces access key ID
 *   DO_SPACES_SECRET    — Spaces secret access key
 *   DO_SPACES_REGION    — e.g. blr1
 *   DO_SPACES_BUCKET    — e.g. chatcart-uploads
 *   REPLIT_API_BASE     — live Replit API base URL (e.g. https://chatcart.in/api)
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";

const {
  DATABASE_URL,
  DO_SPACES_KEY,
  DO_SPACES_SECRET,
  DO_SPACES_REGION,
  DO_SPACES_BUCKET,
  REPLIT_API_BASE = "https://chatcart.in/api",
} = process.env;

if (!DATABASE_URL || !DO_SPACES_KEY || !DO_SPACES_SECRET || !DO_SPACES_REGION || !DO_SPACES_BUCKET) {
  console.error(
    "Missing required env vars. Set DATABASE_URL, DO_SPACES_KEY, DO_SPACES_SECRET, " +
      "DO_SPACES_REGION, and DO_SPACES_BUCKET."
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: DO_SPACES_REGION,
  endpoint: `https://${DO_SPACES_REGION}.digitaloceanspaces.com`,
  credentials: { accessKeyId: DO_SPACES_KEY, secretAccessKey: DO_SPACES_SECRET },
  forcePathStyle: false,
});

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: DO_SPACES_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    "SELECT DISTINCT url FROM product_images WHERE url LIKE '/objects/uploads/%'"
  );
  console.log(`Found ${rows.length} unique image(s) to migrate.`);

  let skipped = 0;
  let uploaded = 0;
  let failed = 0;

  for (const { url } of rows) {
    // /objects/uploads/<uuid>  →  uploads/<uuid>  (S3 key)
    const s3Key = url.replace(/^\/objects\//, "");
    // /objects/uploads/<uuid>  →  public/img/uploads/<uuid>  (Replit API path)
    const apiPath = url.replace(/^\/objects\//, "public/img/");
    const sourceUrl = `${REPLIT_API_BASE}/${apiPath}`;

    if (await objectExists(s3Key)) {
      console.log(`  SKIP  ${s3Key} (already in Spaces)`);
      skipped++;
      continue;
    }

    try {
      const resp = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        console.error(`  FAIL  ${s3Key} — HTTP ${resp.status} from ${sourceUrl}`);
        failed++;
        continue;
      }

      const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
      const buffer = Buffer.from(await resp.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: DO_SPACES_BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      console.log(`  OK    ${s3Key} (${buffer.length} bytes, ${contentType})`);
      uploaded++;
    } catch (e) {
      console.error(`  FAIL  ${s3Key} — ${e.message}`);
      failed++;
    }
  }

  await db.end();

  console.log("");
  console.log(`Migration complete. Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
