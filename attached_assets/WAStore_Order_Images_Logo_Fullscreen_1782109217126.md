# WAStore Builder — Order Images on Seller Side, Missing Logo, Full-Screen Image Tap

## BUG 1 — Seller-side order detail view shows no product images

Context: The customer-facing order confirmation page correctly shows product photos per line item (already verified working). However, the SELLER's own order detail view (e.g. /app/orders/:orderId, where a seller taps into an order from their Orders list) shows only text — item name, quantity, price — with no images at all.

1. Investigate the seller-side order detail page/component and confirm whether it's even querying for product image data, or whether it's using a different (older/simpler) template than the customer-facing version.
2. Add the same product image display (using the existing `product_image_snapshot` field already proven to work on the customer-facing order confirmation page) to the seller-side order detail view — same data source, just render it on this screen too.
3. This matters specifically for packing accuracy — the seller needs to see exactly what was ordered, not just read item names, especially when multiple similar-looking products exist.

## BUG 2 — Missing seller logo on the "Order placed!" confirmation screen

The "Order placed!" confirmation screen shows a generic default storefront icon instead of the seller's actual uploaded logo (Arora Group's real logo), even though the seller has branding configured and their logo displays correctly elsewhere (e.g. their storefront header).

1. Investigate which component renders the header/logo on this specific "Order placed!" screen — confirm whether it's pulling the seller's actual `bannerImageUrl`/logo field, or defaulting to a hardcoded generic icon regardless of whether the seller has branding set.
2. Fix it to correctly display the seller's actual uploaded logo if one exists, falling back to the generic icon only if the seller genuinely has no logo set (consistent with how branding display works elsewhere on the storefront).

## FEATURE — Tap product image to view full-screen (seller order detail view)

Context: When a seller views their order's item list (with images, once Bug 1 above is fixed), tapping a product thumbnail currently does nothing. Sellers want to tap an image to see it larger/clearer — useful for confirming exact product details before packing.

1. Add a tap handler to each product thumbnail in the order detail view: tapping opens that image in a full-screen lightbox/modal (image enlarged, dark overlay background, tap outside or an X button to close).
2. This should work smoothly on mobile (the primary device sellers use) — a simple, standard image lightbox pattern, no need for zoom/pan gestures, just a clear, large view of the image.
3. Apply this same tap-to-fullscreen behavior consistently — if this pattern makes sense on the customer-facing order confirmation page too (where images already work), consider adding it there as well for consistency, though the seller-side order view is the priority for this task.

## Proof required
1. Screenshot of the seller-side order detail view now showing product images per line item.
2. Screenshot of the "Order placed!" screen now showing the seller's actual logo (test with the Arora Group account specifically, since that's the real account where this was observed).
3. Screen recording or before/after screenshots showing tapping a product image in the order detail view now opens a full-screen view of that image.
