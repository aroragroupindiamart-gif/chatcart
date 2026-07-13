import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable, PassThrough } from "stream";
import { randomUUID } from "crypto";
import sharp from "sharp";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

function getSpacesConfig(): {
  region: string;
  bucket: string;
  key: string;
  secret: string;
  endpoint: string;
} {
  const region = process.env.DO_SPACES_REGION;
  const bucket = process.env.DO_SPACES_BUCKET;
  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  if (!region || !bucket || !key || !secret) {
    throw new Error(
      "Missing DigitalOcean Spaces config. Set DO_SPACES_REGION, DO_SPACES_BUCKET, " +
        "DO_SPACES_KEY, and DO_SPACES_SECRET environment variables."
    );
  }
  const endpoint = process.env.S3_ENDPOINT || `https://${region}.digitaloceanspaces.com`;
  return {
    region,
    bucket,
    key,
    secret,
    endpoint,
  };
}

export function createS3Client(): S3Client {
  const { region, key, secret, endpoint } = getSpacesConfig();
  const forcePathStyle = process.env.S3_ENDPOINT ? true : false;
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: key, secretAccessKey: secret },
    forcePathStyle,
  });
}

export function getS3BucketName(): string {
  return getSpacesConfig().bucket;
}

// Singleton client — created lazily so missing env vars only throw at call time.
let _s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3Client) _s3Client = createS3Client();
  return _s3Client;
}

// ---------------------------------------------------------------------------
// S3File — thin wrapper providing a GCS-compatible API over S3 objects.
// Methods: exists(), getMetadata(), createReadStream(), download(),
//          setMetadata(), save(), delete()
// ---------------------------------------------------------------------------
export class S3File {
  constructor(
    public readonly client: S3Client,
    public readonly bucket: string,
    public readonly name: string, // S3 key
  ) {}

  async exists(): Promise<[boolean]> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.name })
      );
      return [true];
    } catch {
      return [false];
    }
  }

  async getMetadata(): Promise<[{ contentType: string; size: number | undefined; metadata: Record<string, string> }]> {
    const resp = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: this.name })
    );
    return [
      {
        contentType: resp.ContentType ?? "application/octet-stream",
        size: resp.ContentLength,
        metadata: (resp.Metadata ?? {}) as Record<string, string>,
      },
    ];
  }

  createReadStream(): Readable {
    const pass = new PassThrough();
    this.client
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: this.name }))
      .then((resp) => {
        const body = resp.Body as any;
        if (body instanceof Readable) {
          body.pipe(pass);
        } else if (body && typeof body[Symbol.asyncIterator] === "function") {
          Readable.fromWeb(body).pipe(pass);
        } else {
          pass.end();
        }
      })
      .catch((e: Error) => pass.destroy(e));
    return pass;
  }

  async download(): Promise<[Buffer]> {
    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.name })
    );
    const body = resp.Body as any;
    if (!body) throw new Error("Empty S3 response body");
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return [Buffer.concat(chunks)];
  }

  async setMetadata(opts: { metadata: Record<string, string> }): Promise<void> {
    // S3 requires a copy-in-place to update metadata
    const [current] = await this.getMetadata();
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${this.name}`,
        Key: this.name,
        Metadata: { ...current.metadata, ...opts.metadata },
        MetadataDirective: "REPLACE",
        ContentType: current.contentType,
      })
    );
  }

  async save(
    content: Buffer,
    opts: { contentType?: string; resumable?: boolean } = {}
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.name,
        Body: content,
        ContentType: opts.contentType,
      })
    );
  }

  async delete(): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: this.name })
    );
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  // ------------------------------------------------------------------
  // Public object search — in DO Spaces, assets are under their direct
  // key path within the bucket (no multi-path search needed).
  // ------------------------------------------------------------------
  async searchPublicObject(filePath: string): Promise<S3File | null> {
    const client = getS3Client();
    const bucket = getS3BucketName();
    const file = new S3File(client, bucket, filePath);
    const [exists] = await file.exists();
    return exists ? file : null;
  }

  async downloadObject(file: S3File, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": metadata.contentType,
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size !== undefined) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  // Upload a file buffer directly from the server to DO Spaces.
  // Images are resized to max 1200px on the longest side and compressed to
  // WebP 80% quality before storage — reduces typical phone photos from
  // 3-8 MB down to 150-400 KB without visible quality loss.
  // Returns the internal /objects/uploads/<uuid> path.
  async uploadFileBuffer(buffer: Buffer, contentType: string): Promise<string> {
    let finalBuffer = buffer;
    let finalContentType = contentType;

    const isCompressible =
      contentType.startsWith("image/") &&
      contentType !== "image/gif" &&
      contentType !== "image/svg+xml" &&
      contentType !== "image/webp";

    if (isCompressible) {
      try {
        finalBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        finalContentType = "image/webp";
      } catch {
        // Corrupt image or unsupported format — store original rather than failing the upload.
      }
    } else if (contentType === "image/webp") {
      // Already WebP — just resize if oversized, preserve format.
      try {
        finalBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        // Fall through to original.
      }
    }

    const client = getS3Client();
    const bucket = getS3BucketName();
    const objectId = randomUUID();
    const key = `uploads/${objectId}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: finalBuffer,
        ContentType: finalContentType,
        ContentLength: finalBuffer.length,
      })
    );

    return `/objects/${key}`;
  }

  // Generates a presigned PUT URL and returns it. The key is uploads/<uuid>.
  async getObjectEntityUploadURL(): Promise<string> {
    const client = getS3Client();
    const bucket = getS3BucketName();
    const objectId = randomUUID();
    const key = `uploads/${objectId}`;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    return signedUrl;
  }

  // Converts a presigned S3 URL back to the internal /objects/... path.
  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      const pathname = url.pathname; // e.g. /uploads/<uuid>
      if (pathname.startsWith("/uploads/") || pathname.includes("/uploads/")) {
        // Strip leading / and prepend /objects
        const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
        return `/objects${cleanPath}`;
      }
    } catch {
      // Not a URL — return as-is
    }
    return rawPath;
  }

  // Resolves /objects/uploads/<uuid> → S3File
  async getObjectEntityFile(objectPath: string): Promise<S3File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/"); // ["objects", "uploads", "<uuid>"]
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    // Strip the leading "objects" segment to get the S3 key
    const s3Key = parts.slice(1).join("/"); // "uploads/<uuid>"

    const client = getS3Client();
    const bucket = getS3BucketName();
    const file = new S3File(client, bucket, s3Key);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return file;
  }

  normalizeObjectEntityPathFromKey(s3Key: string): string {
    return `/objects/${s3Key}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: S3File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
