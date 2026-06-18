# WAStore Builder — Phase 2 Build Instructions (Critical Gaps)

Context: An audit of the current build revealed that several core pieces are missing or broken, despite earlier reports of completion. This phase must fix four specific issues, IN ORDER. Do not move to the next item until the current one is fully working end-to-end and you have demonstrated it — not just written the backend code for it.

For every item below: after building it, show me actual proof it works (a screenshot, a successful API call with real response, or a step-by-step demo). Do not mark anything as done based on the code existing — only mark it done once you've actually run it and confirmed the behavior.

---

## TASK 1 — Fix OTP brute-force vulnerability (DO THIS FIRST — security issue)

Current state: POST /api/auth/verify-otp has no rate limiting. A 6-digit OTP can be brute-forced within its 10-minute expiry window.

Required fix:
1. Add rate limiting on the OTP verification endpoint: max 5 incorrect attempts per phone number, per OTP code.
2. After 5 failed attempts, invalidate that OTP code entirely (force the user to request a new one) and lock that phone number from requesting a new OTP for 15 minutes.
3. Add rate limiting on the OTP *request* endpoint too (POST /api/auth/request-otp): max 3 OTP requests per phone number per hour, to prevent SMS-bombing abuse.
4. Confirm: does the OTP attempt counter reset correctly after a successful login or after a new OTP is issued?

Proof required: Demonstrate (via API calls, e.g. curl or a test script) that the 6th incorrect OTP attempt in a row is rejected even with the correct code, and that the lockout actually triggers.

---

## TASK 2 — Add product image upload UI (backend already exists — just wire up the frontend)

Current state: ObjectStorageService, useRequestUploadUrl, and useAddProductImage hooks already exist and work. There is no UI to use them.

Required fix:
1. Add an image upload section to the product create/edit form: a file input (or drag-and-drop zone) supporting multiple images per product.
2. On selecting images, use the existing two-step flow (request presigned URL → upload directly to storage → save URL via useAddProductImage) — do not rebuild this, it already works.
3. Show upload progress and a thumbnail preview for each image as it uploads.
4. Allow reordering images (using product_images.displayOrder) and deleting an individual image before/after saving.
5. Validate file type (jpg/png/webp only) and size (max 5MB per image) on the client before upload starts, in addition to whatever server-side checks exist.
6. Display the product's images in the product list view (at least the first/primary image as a thumbnail) and on the product detail/edit page.

Proof required: Screenshot of a product being created with at least 2 photos attached, and a screenshot of that product showing its photo in the product list.

---

## TASK 3 — Fix "Share to WhatsApp" to message the seller's actual number

Current state: The share button opens `wa.me/?text=...` with no phone number, which opens a generic contact picker instead of messaging anyone specific.

Required fix:
1. Use the seller's `whatsappNumber` field (already in the `sellers` table) to build the link as `https://wa.me/<countrycode><number>?text=<message>` — strip any spaces, dashes, or leading zeros from the stored number, and confirm the country code (91 for India) is included correctly even if the seller saved their number without it.
2. Add a validation step when a seller sets up their account or edits their profile: confirm their WhatsApp number is saved in a clean, consistent format (e.g., always store as `91XXXXXXXXXX` with no symbols).
3. Confirm the pre-filled message still includes product name, price, and the product's public link.

Proof required: Demonstrate tapping "Share to WhatsApp" and show that it opens a chat directly with the seller's own WhatsApp number (test with a real or test number), not a contact picker.

---

## TASK 4 — Build the customer-facing storefront (this is the big one — the rest of the product depends on it)

Current state: Does not exist at all. This is the most important and largest task. Build it as its own set of sub-steps, and confirm each sub-step works before moving to the next.

### 4a. Public product browsing pages
- A public page (no login required) showing a seller's active products only (status = 'active', never out_of_stock/hidden/deleted) — for now, route can be `/store/:sellerId` or `/store/:subdomain` (use whatever is fastest to wire up now; wildcard subdomain DNS routing is a separate, later task).
- A category browsing/filter view.
- A product detail page showing all images, price, description, and variant options (if any) as selectable dropdowns.
- If `showWhenOutOfStock` is true for a product with stock 0, still show it but clearly marked "Out of Stock" and disable adding it to cart.

### 4b. Cart
- Customer can add multiple products (with selected variants) to a cart, adjust quantity, and remove items — all without logging in.
- Cart state can be simple client-side state (no need for a persistent customer account in v1).

### 4c. Checkout — locked order summary page
- On "Checkout," create an order record in the database (status: 'pending'), generate a unique order ID (ORD-XXXXX format, matching existing schema), and save a snapshot of each item's name/price/variant (using the existing order_items snapshot fields — already correctly designed).
- Generate a unique, public, READ-ONLY url: `/orders/:orderId` showing the locked order summary (items, quantities, total). This page must not be editable by the customer after creation — no "go back and change cart" from this page; if they want to change the order, they start a new one.

### 4d. wa.me checkout handoff
- On the order summary page, a "Confirm via WhatsApp" button that opens `wa.me/<seller's whatsappNumber>?text=<pre-filled order breakdown>` — the message text should include the order ID, each item with quantity and price, and the total.
- This is the actual moment the order becomes "real" to the seller — they receive it as a WhatsApp message and continue the conversation/payment from there, exactly as they do today.

Proof required: A full demo, screenshots or screen recording, of: browsing a seller's storefront as a customer → adding 2+ items with variants to a cart → checking out → landing on a locked order summary page with a real ORD-XXXXX URL → tapping "Confirm via WhatsApp" → seeing it open a chat with the seller's actual number with a correctly pre-filled order message.

---

## After completing all 4 tasks

Give me an updated honesty-check summary in the same format as before:
- What's now fully working (with proof, not just claims)
- What's still partial or missing
- What you're least confident about in what you just built

Do not tell me this phase is "done" unless you can walk through the full customer journey (Task 4 proof) successfully in one continuous run, start to finish.
