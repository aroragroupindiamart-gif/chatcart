# WAStore Builder — Critical Bugs Found During Real Usage (Fix in Priority Order)

Context: These were found by the platform owner actually using the live product as both seller and customer. Fix in the order listed — item 1 is a complete checkout-blocking bug and must be fixed first.

## BUG 1 (CRITICAL — blocks all sales) — "Page not found" after placing an order

A customer adds items to cart, enters name and phone number, taps "Place Order" — and instead of reaching the order confirmation page, they hit a "Page not found" screen. No order appears to complete successfully from the customer's perspective.

1. Investigate the actual checkout submission flow: what does the "Place Order" button call (which API endpoint), and what does it do with the response? Is it trying to redirect/navigate to a URL that doesn't match an existing route?
2. Check whether the order IS actually being created in the database despite the broken redirect (this matters — if orders are silently succeeding but redirecting wrong, that's a routing bug; if orders are failing to create at all, that's a more serious backend bug) — query the orders table for any recent test orders matching this attempt.
3. Fix the actual root cause — whether it's a broken redirect URL (e.g. pointing to a route that doesn't exist or uses the wrong path prefix) or a failed order creation request.
4. Live test end-to-end: add items to cart, enter details, place order, confirm it lands correctly on the real order confirmation page (/store/orders/:orderId or wherever this currently lives) with the correct order details shown.

## BUG 2 — Broken image icons in seller's own Products list

Real uploaded product images are showing as broken-image icons in the seller dashboard's product list (not the storefront — this is on the seller's own management view). An `onError` fallback to a clean placeholder was previously built for the storefront — confirm whether this same fallback exists on the SELLER dashboard's product list view, since it appears to be missing or not firing here.

1. Investigate why these specific images are failing to load — check the actual image URLs being requested (are they valid, do they 404, is there a caching/CDN issue specific to this view).
2. Apply the same onError fallback pattern (graceful fallback to the clean placeholder icon) to the seller dashboard's product list thumbnails, consistent with what exists elsewhere.
3. Fix the root cause of why these particular images aren't loading, not just the visual fallback.

## BUG 3 — Category shows only 1 of 2 uploaded products (but "All Items" shows all correctly)

A seller uploaded 2 products in "Rings" and 2 products in "Anti Tarnish Sets" — but each category tab only shows 1 product, while "All Items" correctly shows all 4. This means the category-specific filter query has a bug, even though the unfiltered/all-products query works correctly.

1. Investigate the category-filtering query/logic specifically (likely on the storefront's category tab click handler or its corresponding API call) — check for an incorrect LIMIT, an incorrect WHERE clause, or a pagination bug that's truncating results to 1 per category.
2. Fix and confirm: a category with 2+ products now correctly shows all of them, not just 1.

## BUG 4 — Editing a product doesn't return to product list

After successfully editing a product (confirmed by the "Product updated successfully" toast), the seller remains on the same edit screen instead of being navigated back to the product list.

1. After a successful product update, navigate the seller back to the product list (or to the product's detail view, whichever fits the existing pattern used elsewhere) instead of leaving them on the edit form.

## BUG 5 — "All Items" tab appears first; should appear last

The category tab order currently shows "All Items" first, then real categories. Change the order so real categories appear first, with "All Items" as the last tab in the row.

## BUG 6 — Refreshing the storefront resets the selected category back to "All Items"

If a customer (or seller checking their own storefront) has a specific category selected and refreshes the page, the view resets to "All Items" instead of staying on the previously selected category.

1. Persist the currently selected category in the URL (e.g. as a query parameter like `?category=rings`) so a refresh preserves the current view, rather than relying on in-memory state alone that resets on reload.
2. Confirm refreshing the page while a specific category is selected keeps that same category active, not resetting to "All Items."

## Proof required for all 6 bugs
Real screenshots or screen recordings showing each issue fixed, tested the same way it was originally found (real product upload, real category check, real checkout attempt, real page refresh).
