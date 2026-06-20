# WAStore Builder — WhatsApp Order Images for Packing + Category-Wise Dozen Discounts

## TASK 1 — Include product images in the WhatsApp order handoff (for packing accuracy)

Context: Currently the wa.me checkout message is text-only (item name, quantity, price). The seller's packing team needs a clear visual reference per item to pack orders accurately and quickly, especially when multiple similar-looking products exist (e.g. several similar gold chains).

Since a single wa.me text message cannot embed multiple inline images per line item, implement this via the order confirmation page instead:

1. The order confirmation page (`/orders/:orderId`, already built) should prominently display each line item with its actual product photo (the primary/first image), name, variant, quantity, and price — make sure this is already true; if any item's image is missing here, add it.
2. The wa.me message text should include a direct, clickable link to this order confirmation page (e.g. "View order with photos: chatcart.in/orders/ORD-XXXXX") right alongside the text breakdown, so the seller can tap through and see a clear visual list while packing — not just rely on text item names.
3. Additionally, explore whether the wa.me message itself can carry a single representative image as an attachment hint (note: standard wa.me web links only support pre-filled TEXT, not image attachments — confirm this limitation and don't attempt anything fragile/unreliable to work around it; the order confirmation page link is the real solution here).
4. On the order confirmation page, make sure images are reasonably large/clear (not tiny thumbnails) since this page's new purpose includes being a packing reference, not just a receipt.

## TASK 2 — Category-wise bulk/dozen discounts (new feature)

Confirmed business rule from the seller: a discount percentage can be set per category. The discount applies per individual product (not combined across different products in a category) once that specific product's quantity in the cart reaches 12 or more (one dozen). The discount rate does NOT increase for multiple dozens — it's a flat percentage applied whenever the 12+ threshold is met for that product, regardless of whether it's exactly 12, 15, 24, or 100 units.

Example: Seller sets a 10% dozen-discount on the "Chains" category. A customer adds 12 units of "Gold Chain A" (also in Chains category) → gets 10% off those 12 units. If they add 15 units, still 10% off all 15 (since 12+ threshold is met). If they add only 8 units, no discount applies. A different product, "Chain B," also in the Chains category, needs its OWN 12+ units in the cart to trigger its own 10% discount — quantities of different products within the same category are NOT combined for this threshold.

### Implementation

1. Add a `dozen_discount_percent` field (nullable, e.g. numeric 5,2) to the `categories` table — this is set per category by the seller, e.g. 10.00 for 10%, 5.00 for 5%, etc. Null/0 means no discount configured for that category.
2. In Settings or the Category management screen, let the seller set/edit/remove this discount percentage for each category they own.
3. Cart logic: for each line item (a specific product + variant combination) in the customer's cart, check the quantity of that line item. If quantity >= 12 AND the product's category has a `dozen_discount_percent` set, apply that discount percentage to that line item's price (price × quantity × (1 - discount/100)).
4. The discount must be clearly shown in the cart and at checkout — e.g. show the original line total, the discount applied (as a percentage and amount), and the final discounted total, so the customer clearly sees why their total is reduced. Don't just silently show a lower number with no explanation.
5. The order summary / order confirmation page and the WhatsApp handoff message must also clearly reflect any discount applied, per line item, so both the seller and customer have a clear, matching record of what was actually charged.
6. This discount must be captured correctly in the order_items snapshot (the existing snapshot fields should record the actual discounted price paid, not the original price) — consistent with the existing principle that order snapshots reflect what was actually agreed at time of order, immutable afterward.
7. Variants: if a product has variants (e.g. different sizes), confirm with reasonable default behavior whether quantity is tracked per variant or per product overall for this discount threshold — the safer default is per exact product+variant combination (e.g. 12 units of "Gold Chain A, Size M" specifically), since that matches how it's added to cart as separate line items. Flag this assumption clearly so it can be confirmed or corrected.

### What NOT to build right now
- No discount stacking with any other discount mechanism (none currently exists, so this is moot for now, just don't build for a future that doesn't exist yet).
- No per-product discount overrides separate from the category-level setting — the discount is set once per category and applies to all products within it uniformly, for this version.

## Proof required
1. Screenshot of the order confirmation page showing clear product images per line item, and confirm the wa.me message includes a working link to this page.
2. Screenshot of the category settings screen showing a discount percentage being set (e.g. 10% on a "Chains" category).
3. Live test: add 12+ units of a product in a discounted category to the cart, show the discount correctly applied and clearly displayed in the cart/checkout.
4. Live test: add 8 units of the same product, show NO discount applied (below threshold).
5. Confirm the order_items snapshot correctly stores the discounted price actually paid, not the original undiscounted price.
