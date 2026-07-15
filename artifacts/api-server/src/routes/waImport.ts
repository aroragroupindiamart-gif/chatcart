import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { db } from "@workspace/db";
import { productsTable, categoriesTable, productImagesTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import path from "path";
import { mkdir, rm } from "fs/promises";
import { ObjectStorageService, getS3Client, getS3BucketName } from "../lib/objectStorage";
import crypto from "crypto";
import QRCode from "qrcode";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { getSellerPlan, getPlanLimits, requireActiveSubscription } from "../lib/planLimits.js";
import { verifyToken } from "../lib/jwt.js";
import { getWASocket } from "../lib/whatsapp.js";

const router: IRouter = Router();
const SESSION_LOCAL_DIR = process.env.WA_SESSION_DIR ?? "/data/wa-session";

interface ImportSession {
  res?: Response;
  sock?: any;
  isCleaningUp?: boolean;
}

const activeSessions = new Map<string, ImportSession>();

function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function cleanUpSession(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session || session.isCleaningUp) return;
  session.isCleaningUp = true;

  console.log(`[WA-IMPORT] Cleaning up session: ${sessionId}`);
  
  if (session.sock) {
    try {
      session.sock.ev.removeAllListeners("connection.update");
      session.sock.ev.removeAllListeners("creds.update");
      await session.sock.logout();
    } catch (e) {
      console.error(`[WA-IMPORT] Error logging out socket: ${sessionId}`, e);
    }
  }

  const sessionPath = path.join(SESSION_LOCAL_DIR, `temp-import-${sessionId}`);
  try {
    await rm(sessionPath, { recursive: true, force: true });
  } catch (e) {
    console.error(`[WA-IMPORT] Error deleting temp session files: ${sessionId}`, e);
  }

  activeSessions.delete(sessionId);
}

const objectStorageService = new ObjectStorageService();

// Helper to download image from public WA CDN and upload to R2
async function uploadProductImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith("http")) return null;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    const objectPath = await objectStorageService.uploadFileBuffer(buffer, contentType);
    return objectPath;
  } catch (err) {
    console.error(`[WA-IMPORT] Failed to download/upload image ${imageUrl}:`, err);
    return null;
  }
}

// Background import task
async function runImport(sessionId: string, sock: any, sellerId: number, res: Response) {
  try {
    console.log("[WA-IMPORT] Full sock.user details:", JSON.stringify(sock.user, null, 2));
    
    let ownJid: string;
    if (sock.user.lid) {
      ownJid = sock.user.lid.split(":")[0] + "@lid";
    } else {
      ownJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    }

    console.log(`[WA-IMPORT] Scanned JID verified. Target Catalog JID: ${ownJid}. Starting catalog download...`);
    
    const adminSock = getWASocket();
    if (!adminSock) {
      throw new Error("Admin WhatsApp connection is offline. Please try again later.");
    }

    // 1. Fetch collections (categories) using the freshly connected temporary owner socket first (LID and Phone JID)
    sendSSE(res, "status", { message: "Fetching collections..." });
    let collections: any[] = [];
    
    const phoneJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const jidTargets = [ownJid];
    if (phoneJid !== ownJid) {
      jidTargets.push(phoneJid);
    }

    const timeoutHelper = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Query timeout")), ms));

    // Try temp socket first (since it is the freshly authenticated owner connection, it has direct authority)
    for (const target of jidTargets) {
      try {
        console.log(`[WA-IMPORT] Freshly querying collections for ${target} via Temp socket (5s timeout)...`);
        const collRes = await Promise.race([
          sock.getCollections(target),
          timeoutHelper(5000)
        ]) as any;

        if (collRes?.collections?.length > 0) {
          collections = collRes.collections;
          console.log(`[WA-IMPORT] Successfully found ${collections.length} collections for ${target} via Temp socket at start`);
          break;
        }
      } catch (err: any) {
        console.warn(`[WA-IMPORT] Fresh Temp socket collections query failed or timed out for ${target}:`, err.message || err);
      }
    }

    // Fall back to admin socket if still empty (just in case)
    if (collections.length === 0) {
      for (const target of jidTargets) {
        try {
          console.log(`[WA-IMPORT] Querying collections for ${target} via Admin socket (3s timeout)...`);
          const collRes = await Promise.race([
            adminSock.getCollections(target),
            timeoutHelper(3000)
          ]) as any;

          if (collRes?.collections?.length > 0) {
            collections = collRes.collections;
            console.log(`[WA-IMPORT] Successfully found ${collections.length} collections for ${target} via Admin socket`);
            break;
          }
        } catch (err: any) {
          console.warn(`[WA-IMPORT] Failed or timed out fetching collections for ${target} via Admin socket:`, err.message || err);
        }
      }
    }

    // 2. Fetch catalog (products) using the stable Admin socket
    sendSSE(res, "status", { message: "Fetching product catalog..." });
    const products: any[] = [];
    let hasNextPage = true;
    let cursor: string | undefined = undefined;
    let pagesFetched = 0;

    while (hasNextPage && pagesFetched < 30) {
      try {
        const catalogRes: any = await adminSock.getCatalog({ jid: ownJid, limit: 30, cursor });
        const pageProducts = catalogRes.products || [];
        console.log(`[WA-IMPORT] Page ${pagesFetched + 1}: Found ${pageProducts.length} products`);
        
        if (pageProducts.length === 0) {
          break;
        }
        
        products.push(...pageProducts);
        cursor = catalogRes.nextPageCursor || (catalogRes as any).nextPage;
        hasNextPage = !!cursor;
        pagesFetched++;
      } catch (err: any) {
        console.error(`[WA-IMPORT] Error fetching catalog page ${pagesFetched + 1}:`, err);
        break;
      }
    }
    
    console.log(`[WA-IMPORT] Found ${products.length} products total via Admin socket`);

    if (products.length === 0) {
      sendSSE(res, "status", { message: "No products found in your WhatsApp catalog." });
      sendSSE(res, "complete", { count: 0 });
      await cleanUpSession(sessionId);
      return;
    }

    // Late-stage fallback: Try to query collections via the Temp socket now that history sync has had time to settle
    if (collections.length === 0) {
      for (const target of jidTargets) {
        try {
          console.log(`[WA-IMPORT] Late-stage querying collections for ${target} via Temp socket...`);
          const collRes = await Promise.race([
            sock.getCollections(target),
            timeoutHelper(15000)
          ]) as any;

          if (collRes?.collections?.length > 0) {
            collections = collRes.collections;
            console.log(`[WA-IMPORT] Successfully found ${collections.length} collections for ${target} via late-stage Temp socket query`);
            break;
          }
        } catch (err: any) {
          console.warn(`[WA-IMPORT] Late-stage Temp socket query failed or timed out for ${target}:`, err.message || err);
        }
      }
    }

    // Create categories & map collection IDs
    const categoryMap = new Map<string, number>();
    for (const coll of collections) {
      if (!coll.name?.trim()) continue;
      const categoryName = coll.name.trim();

      const existing = await db
        .select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.sellerId, sellerId),
            eq(categoriesTable.name, categoryName)
          )
        )
        .limit(1);

      let categoryId: number;
      if (existing.length > 0) {
        categoryId = existing[0].id;
      } else {
        const [newCat] = await db
          .insert(categoriesTable)
          .values({
            sellerId,
            name: categoryName,
          })
          .returning();
        categoryId = newCat.id;
      }
      categoryMap.set(coll.id, categoryId);
    }

    // Map product IDs to their categories based on collection mappings
    const productIdToCategoryId = new Map<string, number>();
    for (const coll of collections) {
      const categoryId = categoryMap.get(coll.id);
      if (categoryId && coll.products) {
        for (const p of coll.products) {
          productIdToCategoryId.set(p.id, categoryId);
        }
      }
    }

    let generalCategoryId: number | null = null;
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();

    // Check seller subscription limits
    const plan = await getSellerPlan(sellerId);
    const limits = getPlanLimits(plan);
    // Fetch all existing categories for this seller to power our heuristic matching fallback
    const existingCategories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.sellerId, sellerId));

    const getHeuristicCategory = (prodName: string, prodDesc: string): number | null => {
      const nameLower = prodName.toLowerCase();
      const descLower = (prodDesc || "").toLowerCase();

      for (const cat of existingCategories) {
        const catNameLower = cat.name.toLowerCase();
        if (catNameLower === "general") continue;

        // Keywords to search for
        const possibleKeywords = [
          "earring", "earcuff", "ring", "chain", "set", "bracelet", 
          "anklet", "necklace", "pendant", "bangle", "jewellery", 
          "jewelry", "nose pin", "arm cuff", "clothing", "food", "snack", "electronics"
        ];

        let keywords = possibleKeywords.filter(kw => catNameLower.includes(kw));

        // If no keyword detected in the category name, use the full category name as keyword
        if (keywords.length === 0) {
          keywords = [catNameLower];
        }

        for (const kw of keywords) {
          // Guard: prevent 'ring' keyword from matching 'earring' or 'earcuff'
          if (kw === "ring") {
            if (nameLower.includes("earring") || nameLower.includes("earcuff")) continue;
            if (descLower.includes("earring") || descLower.includes("earcuff")) continue;
          }

          if (nameLower.includes(kw) || descLower.includes(kw)) {
            return cat.id;
          }
        }
      }
      return null;
    };
    
    let importCount = 0;

    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      sendSSE(res, "status", {
        message: `Importing product ${i + 1}/${products.length}: "${prod.name}"...`
      });

      let categoryId = productIdToCategoryId.get(prod.id) || null;
      if (!categoryId) {
        categoryId = getHeuristicCategory(prod.name, prod.description || "");
      }

      // Assign to fallback "General" if uncategorized
      if (!categoryId) {
        if (!generalCategoryId) {
          const existingGeneral = await db
            .select()
            .from(categoriesTable)
            .where(
              and(
                eq(categoriesTable.sellerId, sellerId),
                eq(categoriesTable.name, "General")
              )
            )
            .limit(1);
          
          if (existingGeneral.length > 0) {
            generalCategoryId = existingGeneral[0].id;
          } else {
            const [newGen] = await db
              .insert(categoriesTable)
              .values({
                sellerId,
                name: "General",
              })
              .returning();
            generalCategoryId = newGen.id;
          }
        }
        categoryId = generalCategoryId;
      }

      // Check limits before setting to active
      let requestedStatus: "active" | "hidden" = "active";
      if (limits.maxActiveProducts !== null) {
        const [{ value: activeCount }] = await db
          .select({ value: count(productsTable.id) })
          .from(productsTable)
          .where(
            and(
              eq(productsTable.sellerId, sellerId),
              eq(productsTable.status, "active")
            )
          );
        if (activeCount >= limits.maxActiveProducts) {
          requestedStatus = "hidden"; // Import as hidden if they exceed plan limits
        }
      }

      const remoteSku = prod.retailerId?.trim() || `wa-${prod.id}`;

      // Upsert product (prevent duplicates & fix prices using unique SKU)
      const existingProduct = await db
        .select()
        .from(productsTable)
        .where(
          and(
            eq(productsTable.sellerId, sellerId),
            eq(productsTable.sku, remoteSku)
          )
        )
        .limit(1);

      let productId: number;
      const parsedPrice = prod.price != null ? String(Number(prod.price) / 1000) : "0";

      if (existingProduct.length > 0) {
        const [updatedProd] = await db
          .update(productsTable)
          .set({
            name: prod.name.trim(),
            sku: remoteSku,
            description: prod.description || null,
            price: parsedPrice,
            categoryId,
            status: requestedStatus,
          })
          .where(eq(productsTable.id, existingProduct[0].id))
          .returning();
        productId = updatedProd.id;
      } else {
        const [newProd] = await db
          .insert(productsTable)
          .values({
            sellerId,
            name: prod.name.trim(),
            sku: remoteSku,
            description: prod.description || null,
            price: parsedPrice,
            categoryId,
            status: requestedStatus,
            stockCount: 0,
            showWhenOutOfStock: false,
          })
          .returning();
        productId = newProd.id;
      }

      // Check if product already has images to avoid duplicate downloads
      const existingImages = await db
        .select()
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, productId))
        .limit(1);

      if (existingImages.length === 0) {
        // Download and upload original-quality images
        const imageUrl = prod.imageUrls?.original || prod.imageUrls?.requested;
        if (imageUrl) {
          const objectPath = await uploadProductImage(imageUrl);
          if (objectPath) {
            await db
              .insert(productImagesTable)
              .values({
                productId: productId,
                url: objectPath,
                displayOrder: 0,
              });
          }
        }
      }

      importCount++;
    }

    sendSSE(res, "complete", { count: importCount });
    await cleanUpSession(sessionId);
  } catch (err: any) {
    console.error(`[WA-IMPORT] Error running import:`, err);
    sendSSE(res, "error", { message: err.message || "Failed to import catalog" });
    await cleanUpSession(sessionId);
  }
}

// Socket Connection Bootstrapper with Auto-Reconnect Logic
async function connectTempSocket(sessionId: string, sellerId: number, res: Response, reconnectCount = 0) {
  const session = activeSessions.get(sessionId);
  if (!session || session.isCleaningUp) return;

  const sessionPath = path.join(SESSION_LOCAL_DIR, `temp-import-${sessionId}`);
  await mkdir(sessionPath, { recursive: true });

  const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath);

  const silentLogger = {
    level: "silent",
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
    child: () => silentLogger,
  };

  const tempSock = makeWASocket({
    auth: authState,
    printQRInTerminal: false,
    logger: silentLogger as any,
    browser: ["Chatcart Catalog Importer", "Chrome", "120.0.0"],
  });

  session.sock = tempSock;

  tempSock.ev.on("creds.update", saveCreds);

  tempSock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        sendSSE(res, "qr", { qr: qrDataUrl });
      } catch (err) {
        console.error("[WA-IMPORT] QRCode generation error:", err);
      }
    }

    if (connection === "open") {
      sendSSE(res, "status", { message: "Scanner connected! Initializing catalog download..." });
      runImport(sessionId, tempSock, sellerId, res).catch((err) => {
        console.error(`[WA-IMPORT] Run import crashed:`, err);
        sendSSE(res, "error", { message: err.message || "Failed during catalog fetch" });
        cleanUpSession(sessionId);
      });
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      
      console.log(`[WA-IMPORT] Connection closed. Code=${code}, LoggedOut=${loggedOut}`);

      if (session.isCleaningUp) {
        // Controlled session teardown (successful import complete). Do not send error.
        return;
      }

      if (loggedOut) {
        sendSSE(res, "error", { message: "QR scanning session logged out or disconnected." });
        cleanUpSession(sessionId);
      } else {
        if (reconnectCount < 5) {
          console.log(`[WA-IMPORT] Reconnecting temp session (attempt ${reconnectCount + 1}/5)...`);
          setTimeout(() => {
            connectTempSocket(sessionId, sellerId, res, reconnectCount + 1).catch((err) => {
              console.error("[WA-IMPORT] Failed to reconnect temp socket:", err);
            });
          }, 2000);
        } else {
          console.log("[WA-IMPORT] Max reconnect attempts reached. Failing.");
          sendSSE(res, "error", { message: "Unable to establish stable session. Please try again." });
          cleanUpSession(sessionId);
        }
      }
    }
  });
}

// 1. Initialize temporary import session mapping
router.post("/sellers/wa-import/start", requireAuth, requireActiveSubscription, async (req: Request, res: Response) => {
  try {
    const sellerId = req.seller!.sellerId;
    const plan = await getSellerPlan(sellerId);
    
    if (plan !== "pro" && plan !== "business" && plan !== "lifetime") {
      res.status(403).json({
        error: "WhatsApp Catalog Import is exclusive to Pro plan users. Upgrade your plan to unlock this feature.",
        upgradeRequired: true,
      });
      return;
    }

    const sessionId = crypto.randomUUID();
    activeSessions.set(sessionId, {});
    res.json({ sessionId });
  } catch (err) {
    console.error("[WA-IMPORT] Failed to start import session:", err);
    res.status(500).json({ error: "Failed to initialize import session" });
  }
});

// 2. Stream QR code and status progress via Server-Sent Events (SSE)
router.get("/sellers/wa-import/stream/:sessionId", async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const session = activeSessions.get(sessionId);

  if (!session) {
    res.status(404).end("Session not found");
    return;
  }

  // Initialize SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  session.res = res;

  const token = req.query.token as string;
  if (!token) {
    sendSSE(res, "error", { message: "Authentication required" });
    res.end();
    return;
  }

  let sellerId: number;
  try {
    const payload = verifyToken(token);
    sellerId = payload.sellerId;
  } catch (err) {
    sendSSE(res, "error", { message: "Invalid or expired session token" });
    res.end();
    return;
  }

  // Start socket connection stream
  connectTempSocket(sessionId, sellerId, res).catch((err) => {
    console.error("[WA-IMPORT] Connection bootstrap crashed:", err);
    sendSSE(res, "error", { message: "Connection establishment failed" });
    cleanUpSession(sessionId);
  });

  // Clean up if the client closes the browser/SSE connection
  req.on("close", () => {
    console.log(`[WA-IMPORT] SSE closed by client for session: ${sessionId}`);
    setTimeout(() => {
      const current = activeSessions.get(sessionId);
      if (current && !current.sock?.user) {
        cleanUpSession(sessionId);
      }
    }, 25000);
  });
});

router.get("/debug", async (req, res) => {
  try {
    const adminSock = getWASocket();
    if (!adminSock) {
      return res.status(500).json({ error: "Admin socket offline" });
    }
    const targetJid = req.query.jid as string;
    if (!targetJid) {
      return res.status(400).json({ error: "Missing jid query parameter" });
    }
    
    console.log(`[WA-DEBUG] Debugging catalog fetch for JID: ${targetJid}`);
    
    let catalog: any = null;
    let collections: any = null;
    let rawResult: any = null;
    let catalogError: any = null;
    let collectionsError: any = null;
    let rawError: any = null;

    try {
      catalog = await adminSock.getCatalog({ jid: targetJid, limit: 10 });
    } catch (e: any) {
      catalogError = { message: e.message, stack: e.stack };
    }

    try {
      collections = await adminSock.getCollections(targetJid);
    } catch (e: any) {
      collectionsError = { message: e.message, stack: e.stack };
    }

    try {
      rawResult = await adminSock.query({
        tag: 'iq',
        attrs: {
          to: 's.whatsapp.net',
          type: 'get',
          xmlns: 'w:biz:catalog'
        },
        content: [
          {
            tag: 'product_catalog',
            attrs: {
              jid: targetJid,
              allow_shop_source: 'true'
            },
            content: [
              { tag: 'limit', attrs: {}, content: Buffer.from('10') },
              { tag: 'width', attrs: {}, content: Buffer.from('100') },
              { tag: 'height', attrs: {}, content: Buffer.from('100') }
            ]
          }
        ]
      });
    } catch (e: any) {
      rawError = { message: e.message, stack: e.stack };
    }

    return res.json({
      targetJid,
      catalog,
      catalogError,
      collections,
      collectionsError,
      rawResult,
      rawError
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default router;
