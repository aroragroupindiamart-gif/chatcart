import path from "path";
import { readFile, mkdir, writeFile } from "fs/promises";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

// Production uses "wa-session/" (existing key — no re-scan needed).
// Dev uses "wa-session-dev/" so both environments never share the same
// WhatsApp credentials and cannot kick each other with Code 440.
const WA_SESSION_PREFIX =
  process.env.NODE_ENV === "production" ? "wa-session" : "wa-session-dev";
const CREDS_FILENAME = "creds.json";

function getS3Client(): S3Client {
  const region = process.env.DO_SPACES_REGION;
  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  if (!region || !key || !secret) {
    throw new Error(
      "Missing DO Spaces config: DO_SPACES_REGION, DO_SPACES_KEY, DO_SPACES_SECRET"
    );
  }
  const endpoint = process.env.S3_ENDPOINT || `https://${region}.digitaloceanspaces.com`;
  const forcePathStyle = process.env.S3_ENDPOINT ? true : false;
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: key, secretAccessKey: secret },
    forcePathStyle,
  });
}

function getBucket(): string {
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!bucket) throw new Error("DO_SPACES_BUCKET not set");
  return bucket;
}

function keyPrefix(): string {
  return `${WA_SESSION_PREFIX}/`;
}

const uploadedLidFiles = new Set<string>();
let uploadTimeout: NodeJS.Timeout | null = null;

// Raw S3 upload function (non-debounced)
async function doUploadCredsToStorage(localDir: string): Promise<void> {
  try {
    const { readdir } = await import("fs/promises");
    const client = getS3Client();
    const bucket = getBucket();
    const prefix = keyPrefix();

    const allFiles = await readdir(localDir);
    const filesToUpload = allFiles.filter(
      (f) => f === CREDS_FILENAME || (f.startsWith("lid-mapping-") && !uploadedLidFiles.has(f))
    );

    if (filesToUpload.length === 0) return;

    for (const filename of filesToUpload) {
      const localPath = path.join(localDir, filename);
      const key = `${prefix}${filename}`;
      try {
        const content = await readFile(localPath);
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: content,
            ContentType: "application/json",
          })
        );
        if (filename.startsWith("lid-mapping-")) {
          uploadedLidFiles.add(filename);
        }
      } catch (e) {
        console.error(`[WA-AUTH] Failed to upload ${filename}:`, e);
      }
    }

    console.log(
      `[WA-AUTH] Backed up ${filesToUpload.length} session file(s) to DO Spaces`
    );
  } catch (e) {
    console.error("[WA-AUTH] Failed to upload session files to storage:", e);
  }
}

// Debounced wrapper to prevent CPU/network thrashing during high-activity syncs
export async function uploadCredsToStorage(localDir: string): Promise<void> {
  if (uploadTimeout) {
    clearTimeout(uploadTimeout);
  }

  return new Promise((resolve) => {
    uploadTimeout = setTimeout(async () => {
      uploadTimeout = null;
      await doUploadCredsToStorage(localDir);
      resolve();
    }, 10000); // 10-second debounce
  });
}

export async function downloadSessionFromStorage(): Promise<boolean> {
  try {
    const client = getS3Client();
    const bucket = getBucket();
    const prefix = keyPrefix();

    // Check creds.json exists first (canonical presence check)
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: `${prefix}${CREDS_FILENAME}` })
      );
    } catch {
      return false;
    }

    // List all objects under the prefix
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );
    const objects = (list.Contents ?? []).filter((o) =>
      o.Key?.endsWith(".json")
    );

    const sessionDir = process.env.WA_SESSION_DIR ?? "/data/wa-session";
    await mkdir(sessionDir, { recursive: true });

    await Promise.all(
      objects.map(async (obj) => {
        if (!obj.Key) return;
        const resp = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: obj.Key })
        );
        const body = resp.Body as any;
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const filename = path.basename(obj.Key);
        await writeFile(path.join(sessionDir, filename), buffer);
      })
    );

    console.log(
      `[WA-AUTH] Downloaded ${objects.length} session file(s) from DO Spaces`
    );
    return true;
  } catch (e) {
    console.error("[WA-AUTH] Failed to download session files from storage:", e);
    return false;
  }
}

export async function deleteSessionFromStorage(): Promise<void> {
  try {
    const client = getS3Client();
    const bucket = getBucket();
    const prefix = keyPrefix();

    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );
    const objects = list.Contents ?? [];

    if (objects.length > 0) {
      await Promise.all(
        objects.map((obj) =>
          obj.Key
            ? client
                .send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
                .catch(() => {})
            : Promise.resolve()
        )
      );
      console.log(
        `[WA-AUTH] Deleted ${objects.length} session file(s) from DO Spaces`
      );
    }
  } catch (e) {
    console.error("[WA-AUTH] Failed to delete session from storage:", e);
  }
}

export async function sessionExistsInStorage(): Promise<boolean> {
  try {
    const client = getS3Client();
    const bucket = getBucket();
    const key = `${keyPrefix()}${CREDS_FILENAME}`;
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function purgeStaleSessionFiles(): Promise<number> {
  try {
    const client = getS3Client();
    const bucket = getBucket();
    const prefix = keyPrefix();

    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );
    const credsKey = `${prefix}${CREDS_FILENAME}`;
    const stale = (list.Contents ?? []).filter((o) => o.Key !== credsKey);

    if (stale.length > 0) {
      await Promise.all(
        stale.map((obj) =>
          obj.Key
            ? client
                .send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
                .catch(() => {})
            : Promise.resolve()
        )
      );
      console.log(`[WA-AUTH] Purged ${stale.length} stale session file(s)`);
    }
    return stale.length;
  } catch (e) {
    console.error("[WA-AUTH] Failed to purge stale session files:", e);
    return 0;
  }
}
