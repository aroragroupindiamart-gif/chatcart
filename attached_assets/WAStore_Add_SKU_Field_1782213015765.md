# WAStore Builder — Add Optional Internal SKU Field to Products

Context: Sellers track their physical stock by SKU. This is an internal-only field for the seller's own reference — it must NEVER be visible to customers anywhere (storefront, cart, checkout, order confirmation, or the WhatsApp message).

## Required changes

1. Add a `sku` column to the `products` table (text, nullable).
2. Add an optional "SKU (internal — not shown to customers)" field to the Add/Edit Product form, positioned near the other optional fields (Stock Count is a sensible neighbor, since they're both inventory-related). Clearly label it as internal/seller-only in the UI so there's no confusion about visibility.
3. Display the SKU as a small secondary line under the product name in the seller's Product list view (e.g. "Ring - 01" with a smaller "SKU: RING-014" beneath it), only when a SKU is set — don't show an empty "SKU:" label for products without one.
4. Add SKU to the existing product search functionality — a seller should be able to find a product by typing its SKU into the same search bar already used for product names, not a separate search field.
5. Enforce SOFT uniqueness per seller (not a hard block): if a seller enters a SKU that already exists on another one of their own products, show a non-blocking warning (e.g. "This SKU is already used by [Product Name] — continue anyway?") but still allow them to save if they confirm. Do NOT enforce uniqueness across different sellers — two different sellers can have identical SKUs with no conflict.
6. Confirm SKU is correctly EXCLUDED from: the customer-facing storefront (product cards, product detail page), the cart, the checkout/order confirmation page, and the WhatsApp message text. It should only ever appear in the seller's own dashboard (product list, product edit form, search).
7. Include SKU in the existing "Export my store data" feature (Pro tier) — this is exactly the kind of internal reference data a seller would want in their own exported records.

## Proof required
1. Screenshot of the Add/Edit Product form showing the new SKU field, clearly labeled as internal-only.
2. Screenshot of the Product list showing a product's SKU displayed as a secondary line under its name.
3. Live test: search for a product by typing its SKU into the existing search bar, confirm it's found.
4. Live test: attempt to save a second product with a SKU already used by another product from the same seller — confirm the soft warning appears but saving is still allowed if confirmed.
5. Confirm SKU does NOT appear anywhere on the customer-facing storefront, cart, checkout, order confirmation page, or WhatsApp message — check each of these specifically.
6. Confirm SKU appears correctly in a test data export.
