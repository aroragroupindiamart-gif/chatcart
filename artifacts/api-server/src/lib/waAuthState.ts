import path from "path";
import { readdir, readFile, mkdir, writeFile } from "fs/promises";
import { objectStorageClient } from "./objectStorage.js";

const WA_SESSION_PREFIX = "wa-session";

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

async function getAllLocalFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllLocalFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

export async function uploadAllSessionFiles(localDir: string): Promise<void> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);

    const files = await getAllLocalFiles(localDir).catch(() => [] as string[]);
    if (files.length === 0) return;

    await Promise.all(
      files.map(async (filePath) => {
        const rel = path.relative(localDir, filePath).replace(/\\/g, "/");
        const objectName = `${prefix}${rel}`;
        const content = await readFile(filePath);
        await bucket.file(objectName).save(content, {
          contentType: "application/octet-stream",
          resumable: false,
        });
      }),
    );

    console.log(`[WA-AUTH] Backed up ${files.length} session file(s) to object storage`);
  } catch (e) {
    console.error("[WA-AUTH] Failed to upload session to storage:", e);
  }
}

export async function downloadSessionFromStorage(): Promise<boolean> {
  try {
    const { bucketName, basePath } = getStorageBase();
    const bucket = objectStorageClient.bucket(bucketName);
    const prefix = objectPrefix(basePath);

    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) return false;

    await Promise.all(
      files.map(async (file) => {
        const rel = file.name.slice(prefix.length);
        if (!rel) return;
        const localPath = path.join("/tmp/wa-session", rel);
        await mkdir(path.dirname(localPath), { recursive: true });
        const [buffer] = await file.download();
        await writeFile(localPath, buffer);
      }),
    );

    console.log(`[WA-AUTH] Downloaded ${files.length} session file(s) from object storage`);
    return true;
  } catch (e) {
    console.error("[WA-AUTH] Failed to download session from storage:", e);
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
    const [files] = await bucket.getFiles({ prefix, maxResults: 1 });
    return files.length > 0;
  } catch {
    return false;
  }
}
