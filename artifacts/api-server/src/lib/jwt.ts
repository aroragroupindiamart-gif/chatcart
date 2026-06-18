import jwt from "jsonwebtoken";

const envSecret = process.env.JWT_SECRET;
if (!envSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable must be set in production");
}
const JWT_SECRET = envSecret ?? "chatcart-dev-secret-change-in-prod";
const JWT_EXPIRES_IN = "30d";

export interface JwtPayload {
  sellerId: number;
  phone: string;
  tokenVersion: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
