---
name: Chatcart project overview
description: Key facts about the Chatcart project — DB seed data, store URLs, architecture, plan enforcement
---

## Seeded demo data
- Demo seller subdomain: `sharma-general`, store name: "Sharma General Store", phone: +919876543210
- Plan: `starter` (updated from `trial`)
- Products: Bluetooth Earbuds, USB-C Cable, Cotton Kurta, Denim Jeans (OOS), Chakli, Dry Fruit Box, Phone Stand (hidden)
- Categories: Electronics, Clothing, Food & Snacks

## Artifacts
- Dashboard (sellers): /  — port 23368
- API server: port 8080, base /api
- Customer storefront: /store/ — port 26202
- Marketing: /marketing/
- Admin: /admin/

## Pending activation gate
New sellers get `subscriptionPlan = "pending"` by default (DB default).
- All seller API routes return HTTP 403 `{ code: "PENDING_ACTIVATION" }` via `requireActiveSubscription` middleware.
- `/api/auth/me` always returns 200 regardless of plan.
- ProtectedRoute.tsx renders `PendingActivation.tsx` when plan = "pending".
- Admin activates via PATCH `/api/admin/sellers/:id/subscription` body `{ plan, status }`.
- WhatsApp number constant in `PendingActivation.tsx` is currently a placeholder `"919999999999"` — replace with real number before going live.

## Subscription plans (enforced server-side)
Three tiers in `artifacts/api-server/src/lib/planLimits.ts`:

| Plan | Active products | Variants | Branding | CSV import | Export | Order history |
|------|----------------|----------|----------|------------|--------|---------------|
| Starter ₹99 | 25 | ✗ | ✗ | ✗ | ✗ | 30 days |
| Growth ₹199 | 100 | ✓ | ✗ | ✗ | ✗ | Full |
| Pro ₹299 | Unlimited | ✓ | ✓ | ✓ | ✓ | Full |

DB enum includes legacy values: `["trial","basic","pro","business","starter","growth"]`. Helper normalises: trial→Starter, basic→Growth, business→Pro.

**Why:** Old enum values kept for backward compat so existing DB rows don't break after the push.

**Key enforcement:** All 403 plan gates return `{ error: "...", upgradeRequired: true }`. Plan lookup requires a DB query (not in JWT) — use `getSellerPlan(sellerId)` from planLimits.ts. GET /auth/me returns subscriptionPlan and subscriptionStatus.

## Image URL convention
- Stored in DB as: `/objects/uploads/<uuid>`
- Served publicly via: `/api/public/img/uploads/<uuid>`
- Frontend helper: `imgSrc(url)` in store and dashboard components

## Public store API routes (no auth)
GET /api/public/sellers/:subdomain
GET /api/public/sellers/:subdomain/categories
GET /api/public/sellers/:subdomain/products
GET /api/public/products/:productId
POST /api/public/orders
GET /api/public/orders/:orderId  → includes sellerSubdomain, sellerWhatsappNumber

## OTP auth (dev)
OTP is logged to API server console — no SMS service. JWT expiry 30 days.
OTP verify endpoint: POST /api/auth/verify-otp with body `{ phone, otp }` (field is `otp`, not `code`).

**Why:** Avoids accidental spending on SMS in dev.

## Auth token getter race condition (FIXED)
`auth.ts` calls `initAuth()` at module load time (bottom of file). Previously it was only called in App's `useEffect`, which races with React Query's first fetch — React Query fires before the `useEffect` settles, sending requests without an Authorization header → 401.

**Fix:** Added `initAuth()` call at the bottom of `artifacts/chatcart-web/src/lib/auth.ts` so `_authTokenGetter` is set synchronously on import, before any component renders.

## Codegen
- Spec: `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen`
- Body schemas must be entity-shaped (not `<OperationId>Body`) to avoid TS2308 collisions in api-zod barrel.

## DB
- Push: `pnpm --filter @workspace/db run push`
