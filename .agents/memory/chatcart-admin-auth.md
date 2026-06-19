---
name: Chatcart admin auth
description: How admin authentication works — separate from seller OTP auth, important to keep them independent.
---

## Admin auth is completely separate from seller auth

- Seller auth: phone + OTP → JWT with `{ sellerId, phone, tokenVersion }`, secret = `JWT_SECRET`
- Admin auth: email + password (bcrypt) → JWT with `{ adminId, email, role }`, secret = `JWT_SECRET + "-admin"`

**Why:** The two systems must never be interchangeable. A seller JWT must not grant admin access and vice versa. Using a different secret suffix enforces this at the cryptographic level.

## Middleware location
- Seller: `artifacts/api-server/src/middleware/auth.ts` → `requireAuth`
- Admin: `artifacts/api-server/src/middleware/adminAuth.ts` → `requireAdminAuth`, `signAdminToken`, `verifyAdminToken`

## All admin routes are under `/api/admin/*`

## Rate limiting
Admin login: 5 failed attempts → 15-minute lockout. Tracked via `login_attempts` + `login_locked_until` columns on `admin_users` table.

## Seeded dev admin
- Email: `admin@chatcart.in`
- Password: `chatcart-admin-2026`
- Role: `super_admin`

**How to apply:** Any future admin route must use `requireAdminAuth`. Never use `requireAuth` (seller middleware) on admin routes or vice versa.
