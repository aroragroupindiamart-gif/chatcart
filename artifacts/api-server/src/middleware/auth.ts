import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt.js";
import { db } from "@workspace/db";
import { sellersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      seller?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (async () => {
    const [seller] = await db
      .select({ tokenVersion: sellersTable.tokenVersion })
      .from(sellersTable)
      .where(eq(sellersTable.id, payload.sellerId))
      .limit(1);

    if (!seller || seller.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ error: "Session has been invalidated. Please log in again." });
      return;
    }
    req.seller = payload;
    next();
  })().catch(next);
}
