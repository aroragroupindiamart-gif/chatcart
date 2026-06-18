# WAStore Builder — PRD Completion Audit

Instructions for Replit Agent: Answer each question specifically with a yes/no/partial, and show the actual relevant code, screen, or behavior as proof. Do not say "yes" or "done" without evidence. If something is partially built, explain exactly what's missing. Be fully honest — I will be checking this against the original requirements myself.

---

## SECTION A — Architecture Principles (Non-Negotiables)

**A1. Single Source of Truth**
1. Is there any code, feature, or reference anywhere that syncs with or imports from WhatsApp Business app's native catalog? (There should be none — confirm this.)
2. Is there a bulk CSV import feature for sellers migrating their existing catalog? Show the upload flow.

**A2. Soft-Delete Only**
3. Show me the exact database states a product can be in (e.g. active / out_of_stock / hidden / deleted).
4. When a seller sets a product's stock to 0, what actually happens in the database? Does the row get deleted, or does only a status field change? Show the code.
5. When a seller taps "hide" or "archive" a product, is it still retrievable/restorable afterward? Demonstrate restoring a hidden product back to active.
6. Is there any user action in the current build that permanently deletes a product immediately, without a separate confirmation step? If yes, where?

**A3. Manual Sort Override**
7. Is the default product list sorted newest-first?
8. Can a seller manually drag-and-drop reorder products? Does that manual order persist after refreshing or logging back in?

**A4. WhatsApp Stays the Channel, Not the Catalog**
9. Confirm: is there any Meta Cloud API integration anywhere in the codebase? (There should be none in v1.)
10. Show the actual wa.me link/intent generation code used for checkout and for "share to WhatsApp."

**A5. Cloud-Native Storage**
11. Where are product images currently stored — local Replit disk, or S3 / DigitalOcean Spaces? Show the upload code and confirm the storage destination.

**A6. Mobile-First**
12. Has the admin dashboard been tested on an actual mobile screen width (not just resized desktop browser)? Show a mobile screenshot of: product list, add-product screen, and order view.
13. Show a mobile screenshot of the customer-facing storefront: category browsing, product detail, and cart.

**A7. Build vs Host Separation**
14. Is the database currently Replit's built-in database, or an external Postgres instance? 
15. Confirm there is no hard-coded dependency on Replit-specific services that would break on a different host.

---

## SECTION B — Functional Requirements (from PRD Section B5)

For each, answer Done / Partial / Not Started, and show proof.

16. **FR-1**: Product CRUD — name, price, description, multiple photos, category (assigned at creation, not after), variant options, stock count. Demonstrate creating a new product end-to-end, including assigning a category during creation (not as a separate step after).
17. **FR-2**: Product states (active/out_of_stock/hidden/deleted) with one-tap transitions between all non-deleted states. Demonstrate moving a product through all states.
18. **FR-3**: Search and category/status filtering on the admin product list. Demonstrate searching for a product by name, and filtering by category and by status.
19. **FR-4**: Default newest-first sort, plus persistent manual reorder. (Covered above in A3 — confirm again here.)
20. **FR-5**: "Share to WhatsApp" / "Copy Chat Link" button on every product. Demonstrate tapping it and show the resulting pre-filled WhatsApp message.
21. **FR-6**: Customer-facing storefront — category browsing, product detail view, cart. Demonstrate a customer adding multiple items to a cart.
22. **FR-7**: Locked, read-only order summary page at a unique URL (/orders/ORD-XXXXX). Show an actual generated order URL and confirm it cannot be edited by the customer after creation.
23. **FR-8**: wa.me checkout handoff — generates a pre-filled order breakdown text routed to the seller's WhatsApp number. Demonstrate the full checkout flow from cart to the WhatsApp message being generated.
24. **FR-9**: Multi-tenant wildcard subdomain per seller (storename.domain.com). Show two different seller accounts and confirm each has a distinct, working subdomain (or local equivalent if domain isn't connected yet).
25. **FR-10**: Bulk CSV import for initial catalog migration. (Covered above in A1 — confirm again here with a demo.)
26. **FR-11**: 30-day soft-delete retention with restore, before permanent deletion. Is the 30-day timer actually implemented, or just immediate soft-delete with no expiry logic?
27. **FR-12**: Basic order history view for sellers. Demonstrate viewing a list of past orders.
28. **FR-13**: Variant dropdown maps (size/color/stone) configurable per product. Demonstrate adding a product with multiple variant options and show how a customer selects a variant on the storefront.

---

## SECTION C — Multi-Tenancy & Data Isolation (Critical — Security)

29. Does every database table that stores seller-specific data (products, categories, variants, orders) have a seller_id (or equivalent) column?
30. Show me the actual query code for fetching the product list and for fetching a single product by ID. Confirm the WHERE clause filters by the logged-in seller's ID.
31. If I log in as Seller A and try to directly access a product ID or order ID that belongs to Seller B (e.g. by guessing/changing the URL), what happens? Demonstrate this test.

## SECTION D — Core Engineering Hygiene

32. Are all database queries using parameterized queries or an ORM, or is there any raw string-concatenated SQL anywhere in the codebase?
33. How are seller passwords stored? Confirm bcrypt or argon2 hashing is used — show the signup code.
34. Is there any rate-limiting on login attempts?
35. Is uploaded file type/size validated on the server side (not just in the browser)?

## SECTION E — Data Model (PRD Section B7)

36. Paste the complete current database schema (all tables and columns).
37. Confirm: do order_items store a snapshot of product name/price/variant at the time of the order, or do they just reference the live product (which would change if the product is later edited or archived)?

## SECTION F — Non-Functional Requirements (PRD Section B6)

38. What is the actual page load time for the storefront on a throttled/slow mobile connection? (Ask Replit to test this, or describe how to test it.)
39. When a seller hides or restores a product, how quickly does that change reflect on the live customer-facing storefront? Is there any caching delay?

## SECTION G — Overall Honesty Check

40. Give me a complete bullet-point list of every single feature from this audit that is NOT fully working yet, in one place, ranked by how serious the gap is.
41. If you had to bet your own reputation on it, what is the one part of this build you are least confident about?
