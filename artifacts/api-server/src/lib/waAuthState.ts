import path from "path";
import { readFile, mkdir, writeFile } from "fs/promises";
import { objectStorageClient } from "./objectStorage.js";

// Production uses "wa-session/" (existing key — no re-scan needed).
// Dev uses "wa-session-dev/" so both environments never share the same
// WhatsApp credentials and cannot kick each other with Code 440.
const WA_SESSION_PREFIX =
  process.env.NODE_ENV === "production" ? "wa-session" : "wa-session-dev";
const CREDS_FILENAME = "creds.json";

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — configure object storage first");
  return dir.replace(/\/$/, "");
}

function getStorageBase(): { bucketName: string; basePath: string } {
  const privateDir = getPrivateDir();
  const normalized = privateDir.startsWith("/") ? privateDir : `/${privateDir}`;
  const parts = normalized.split("/");
  return {
    bucketName: parts[1],
    basePath: parts.slice(2).join("/"),
  };
}

function objectPrefix(basePath: string): string {
  return basePath ? `${basePath}/${WA_SESSION_PREFIX}/` : `${WA_SESSION_PREFIX}/`;
}

// Upload every file in localDir to object storage (creds.json + all key files).
// This preserves lid-mapping, app-state-sync-key, and sender-key files so that
// Baileys can fully restore its state (including LID→phone mappings) on restart.
export async function uploadCredsToStorage(localDir: string): Promise<void> {
  try {
    const { readdir } = await import("fs/promises");
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);

    const files = await readdir(localDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    await Promise.all(
      jsonFiles.map(async (filename) => {
        const localPath = path.join(localDir, filename);
        const objectName = `${prefix}${filename}`;
        const content = await readFile(localPath);
        await bucket.file(objectName).save(content, {
          contentType: "application/json",
          resumable: false,
        });
      }),
    );

    console.log(`[WA-AUTH] Backed up ${jsonFiles.length} session file(s) to object storage`);
  } catch (e) {
    console.error("[WA-AUTH] Failed to upload session files to storage:", e);
  }
}

export async function downloadSessionFromStorage(): Promise<boolean> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);

    // Check creds.json exists first (canonical presence check)
    const credsObject = bucket.file(`${prefix}${CREDS_FILENAME}`);
    const [exists] = await credsObject.exists();
    if (!exists) return false;

    // Download all .json files under the prefix
    const [files] = await bucket.getFiles({ prefix });
    const jsonFiles = files.filter((f) => f.name.endsWith(".json"));

    await mkdir("/tmp/wa-session", { recursive: true });
    await Promise.all(
      jsonFiles.map(async (file) => {
        const filename = path.basename(file.name);
        const localPath = path.join("/tmp/wa-session", filename);
        const [buffer] = await file.download();
        await writeFile(localPath, buffer);
      }),
    );

    console.log(`[WA-AUTH] Downloaded ${jsonFiles.length} session file(s) from object storage`);
    return true;
  } catch (e) {
    console.error("[WA-AUTH] Failed to download session files from storage:", e);
    return false;
  }
}

export async function deleteSessionFromStorage(): Promise<void> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);

    const [files] = await bucket.getFiles({ prefix });
    if (files.length > 0) {
      await Promise.all(files.map((f) => f.delete().catch(() => {})));
      console.log(`[WA-AUTH] Deleted ${files.length} session file(s) from object storage`);
    }
  } catch (e) {
    console.error("[WA-AUTH] Failed to delete session from storage:", e);
  }
}

export async function sessionExistsInStorage(): Promise<boolean> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);
    const objectName = `${prefix}${CREDS_FILENAME}`;
    const [exists] = await bucket.file(objectName).exists();
    return exists;
  } catch {
    return false;
  }
}

export async function purgeStaleSessionFiles(): Promise<number> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);

    const [files] = await bucket.getFiles({ prefix });
    const credsPath = `${prefix}${CREDS_FILENAME}`;
    const stale = files.filter((f) => f.name !== credsPath);

    if (stale.length > 0) {
      await Promise.all(stale.map((f) => f.delete().catch(() => {})));
      console.log(`[WA-AUTH] Purged ${stale.length} stale session file(s)`);
    }
    return stale.length;
  } catch (e) {
    console.error("[WA-AUTH] Failed to purge stale session files:", e);
    return 0;
  }
}
