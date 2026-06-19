import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const envSecret = process.env.JWT_SECRET;
const ADMIN_JWT_SECRET = (envSecret ?? "chatcart-dev-secret-change-in-prod") + "-admin";

export interface AdminJwtPayload {
  adminId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminJwtPayload;
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAdminToken(token);
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
