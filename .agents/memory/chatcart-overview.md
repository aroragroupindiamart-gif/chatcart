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

**Why:** Avoids accidental spending on SMS in dev.

## Codegen
- Spec: `lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen`
- Body schemas must be entity-shaped (not `<OperationId>Body`) to avoid TS2308 collisions in api-zod barrel.

## DB
- Push: `pnpm --filter @workspace/db run push`
