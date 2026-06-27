import path from "path";
import { readFile, mkdir, writeFile } from "fs/promises";
import { objectStorageClient } from "./objectStorage.js";

const WA_SESSION_PREFIX = "wa-session";
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

export async function uploadCredsToStorage(localDir: string): Promise<void> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);
    const objectName = `${prefix}${CREDS_FILENAME}`;
    const localPath = path.join(localDir, CREDS_FILENAME);

    const content = await readFile(localPath);
    await bucket.file(objectName).save(content, {
      contentType: "application/json",
      resumable: false,
    });

    console.log(`[WA-AUTH] Backed up creds.json to object storage`);
  } catch (e) {
    console.error("[WA-AUTH] Failed to upload creds.json to storage:", e);
  }
}

export async function downloadSessionFromStorage(): Promise<boolean> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);
    const objectName = `${prefix}${CREDS_FILENAME}`;

    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) return false;

    const localPath = path.join("/tmp/wa-session", CREDS_FILENAME);
    await mkdir(path.dirname(localPath), { recursive: true });
    const [buffer] = await file.download();
    await writeFile(localPath, buffer);

    console.log(`[WA-AUTH] Downloaded creds.json from object storage`);
    return true;
  } catch (e) {
    console.error("[WA-AUTH] Failed to download creds.json from storage:", e);
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
