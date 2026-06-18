# Storage Ownership Enforcement — Live Two-Seller Proof

Date: 2026-06-18

## Setup

- **Seller A** — sellerId=1, subdomain=`sharma-general`, owns `product_images.url = /objects/uploads/test-img-aaa`
- **Seller B** — sellerId=2, subdomain=`test-seller-b`, owns `product_images.url = /objects/uploads/test-img-seller-b`

Both tokens are signed with the dev JWT secret (`chatcart-dev-secret-change-in-prod`).

---

## Test 1 — Seller A token + Seller B's filename → 403 Forbidden

```
GET /api/storage/objects/uploads/test-img-seller-b
Authorization: Bearer <Seller A JWT>

HTTP/1.1 403 Forbidden
Content-Type: application/json
{"error":"Forbidden"}
```

---

## Test 2 — Seller A token + Seller A's own filename → 404 Not Found (ownership passes, file absent from object storage)

```
GET /api/storage/objects/uploads/test-img-aaa
Authorization: Bearer <Seller A JWT>

HTTP/1.1 404 Not Found
Content-Type: application/json
{"error":"Object not found"}
```

---

## Test 3 — Seller B token + Seller A's filename → 403 Forbidden

```
GET /api/storage/objects/uploads/test-img-aaa
Authorization: Bearer <Seller B JWT>

HTTP/1.1 403 Forbidden
Content-Type: application/json
{"error":"Forbidden"}
```

---

## Test 4 — Seller B token + Seller B's own filename → 404 Not Found (ownership passes, file absent from object storage)

```
GET /api/storage/objects/uploads/test-img-seller-b
Authorization: Bearer <Seller B JWT>

HTTP/1.1 404 Not Found
Content-Type: application/json
{"error":"Object not found"}
```

---

## Test 5 — No token → 401

```
GET /api/storage/objects/uploads/test-img-aaa
(no Authorization header)

HTTP/1.1 401 Unauthorized
```

---

## Test 6 — Public image endpoint unchanged (no auth required)

```
GET /api/public/img/uploads/test-img-aaa
(no Authorization header)

HTTP/1.1 404 Not Found   (file absent from storage, but NOT 401)
```

All tests run live against the running API server.
