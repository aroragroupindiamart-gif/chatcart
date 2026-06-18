---
name: Chatcart project overview
description: Key facts about the Chatcart project — DB seed data, store URLs, architecture
---

## Seeded demo data
- Demo seller subdomain: `sharma-general`, store name: "Sharma General Store"
- Products: Bluetooth Earbuds, USB-C Cable, Cotton Kurta, Denim Jeans (OOS, showWhenOutOfStock=false), Chakli, Dry Fruit Box, Phone Stand (hidden)
- Categories: Electronics, Clothing, Food & Snacks

## Artifacts
- Dashboard (sellers): /  — port 23368
- API server: port 8080, base /api
- Customer storefront: /store/ — port 26202

## Image URL convention
- Stored in DB as: `/objects/uploads/<uuid>`
- Served publicly via: `/api/public/img/uploads/<uuid>`
- Frontend helper: `imgSrc(url)` in `artifacts/chatcart-store/src/lib/api.ts`

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
