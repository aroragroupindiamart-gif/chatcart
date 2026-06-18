import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
  RequestLogoUploadUrlBody,
  RequestLogoUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middleware/auth.js";
import { db } from "@workspace/db";
import { productImagesTable, productsTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for a product image upload.
 * Requires productId — verifies the product belongs to the authenticated seller,
 * then atomically creates the product_images row and returns the presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { productId, name, size, contentType, displayOrder } = parsed.data;
  const sellerId = req.seller!.sellerId;

  try {
    // Verify the product exists and belongs to the authenticated seller
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.sellerId, sellerId)))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found or not owned by this seller" });
      return;
    }

    // Determine display order: if not provided, append after existing images
    let resolvedDisplayOrder = displayOrder;
    if (resolvedDisplayOrder === 0) {
      const [{ imageCount }] = await db
        .select({ imageCount: count() })
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, productId));
      resolvedDisplayOrder = imageCount;
    }

    // Generate the presigned upload URL
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    // Atomically create the product_images row before the upload happens.
    // The row is written now so the file is always linked to a product — no orphans.
    const [newImage] = await db
      .insert(productImagesTable)
      .values({
        productId,
        url: objectPath,
        displayOrder: resolvedDisplayOrder,
      })
      .returning({ id: productImagesTable.id });

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        imageId: newImage.id,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /storage/uploads/request-logo-url
 *
 * Request a presigned URL for a seller logo or banner image upload.
 * These are not product images and are not linked to product_images rows —
 * they are referenced directly on the seller record (bannerImageUrl).
 */
router.post("/storage/uploads/request-logo-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestLogoUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestLogoUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating logo upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/uploads/:filename
 *
 * Serve uploaded object entities (product images) for the authenticated seller.
 * Restricted to the uploads/ prefix only — no path traversal, no cross-prefix access.
 * Images are also accessible publicly via /api/public/img/uploads/:filename.
 */
router.get("/storage/objects/uploads/:filename", requireAuth, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    // Reject path traversal attempts
    if (!filename || filename.includes("/") || filename.includes("..") || filename.includes("\0")) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    const objectPath = `/objects/uploads/${filename}`;

    // Ownership check: ensure the file belongs to a product owned by the authenticated seller.
    // Return 403 without revealing whether the file exists.
    const sellerId = req.seller!.sellerId;
    const ownershipRows = await db
      .select({ id: productImagesTable.id })
      .from(productImagesTable)
      .innerJoin(productsTable, eq(productImagesTable.productId, productsTable.id))
      .where(
        and(
          eq(productImagesTable.url, objectPath),
          eq(productsTable.sellerId, sellerId),
        ),
      )
      .limit(1);

    if (ownershipRows.length === 0) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * GET /public/img/*path
 *
 * Serve product images publicly (no auth required).
 * Product images are inherently public — they're shown on the customer storefront.
 * Path should be the objectPath without the leading /objects/ prefix,
 * e.g. /api/public/img/uploads/<uuid>
 */
router.get("/public/img/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${filePath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile, 86400);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const { Readable } = await import("stream");
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving public image");
    res.status(500).json({ error: "Failed to serve image" });
  }
});

export default router;
