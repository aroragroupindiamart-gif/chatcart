import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import bcrypt from "bcrypt";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@chatcart.in";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "chatcart-admin-2026";

const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

await db
  .insert(adminUsers)
  .values({ email: ADMIN_EMAIL, passwordHash: hash, role: "super_admin" })
  .onConflictDoUpdate({ target: adminUsers.email, set: { passwordHash: hash } });

console.log(`Admin user seeded: ${ADMIN_EMAIL}`);
process.exit(0);
