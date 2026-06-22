# WAStore Builder — Persistent Cart + Stock Revalidation at Checkout (Major Feature)

Context: Four related changes. Items 3 and 4 together form the most important fix in this batch — cart contents are currently lost on page close/crash, which is a direct lost-sale problem and undermines this platform's core "nothing disappears unexpectedly" promise, just on the buyer side instead of the seller side.

## ITEM 1 — Store name/logo in header should link to the storefront home

1. On every customer-facing storefront page (product list, product detail, cart, checkout, order confirmation), make the seller's store name + logo in the header a clickable link that navigates back to that seller's main storefront catalogue view (e.g. /store/:slug), consistent with how "Continue shopping" already behaves.
2. Apply this consistently across every page in the customer-facing flow — this should never be a dead, unclickable element anywhere.

## ITEM 2 — Add a visual scroll indicator to the category tabs row

Context: When a seller has more categories than fit on one screen width, the horizontally-scrollable category tab row gives no visual hint that more categories exist off-screen — it looks like a short, complete list.

1. Add a clear visual affordance indicating more content exists to the right: a subtle fade/gradient at the right edge of the tab row (most common, clean solution), and/or a small right-pointing chevron arrow at the edge that's tappable to scroll further.
2. Ensure the row still scrolls smoothly via normal swipe/drag on mobile regardless of which visual indicator is chosen — the fade/arrow is a hint, not the only way to scroll.
3. If the user has scrolled to the end (no more categories to the right), the indicator should disappear (and similarly, show a left-side fade/arrow once they've scrolled away from the start, so it works in both directions).

## ITEM 3 — Persistent cart (CRITICAL — fixes silent cart data loss)

Context: Cart contents are currently lost when the browser tab/window closes, crashes, or the device restarts — likely because cart state is held only in memory (e.g. React Context/state) with no persistence layer. This needs to survive exactly like WhatsApp's own cart behavior, which persists indefinitely until checkout.

1. Persist cart contents to `localStorage`, scoped per-seller (e.g. a storage key like `cart_<sellerSlug>` so a customer browsing multiple different sellers' stores doesn't get carts mixed together).
2. On page load, restore the cart from localStorage if it exists, rather than always starting empty.
3. The cart should persist indefinitely (not just for a session) — a customer closing the browser and returning a week or a month later should see their cart exactly as they left it, matching the WhatsApp catalog behavior referenced as the standard to match.
4. The cart should ONLY be cleared after a successful order is placed (i.e. after reaching the order confirmation page) — not on tab close, not on a timer, not on any other event.
5. Confirm this works across a real test: add items to cart, fully close the browser app (not just the tab — actually kill the app/browser process), reopen, navigate back to the same store, and confirm the cart is restored with the same items.

## ITEM 4 — Stock revalidation at checkout (handles items that became unavailable while sitting in a persisted cart)

Context: Now that carts persist for potentially long periods, a product in someone's cart might be deleted, marked out of stock, or have its price changed by the seller before the customer checks out. This must be handled gracefully, not silently broken.

1. At the moment a customer proceeds to checkout (before the order is actually created), re-validate every item currently in their cart against the live database: confirm each product still exists, is still 'active' (not hidden/deleted), and has sufficient stock for the requested quantity.
2. If any cart items are no longer valid (deleted, hidden, out of stock, or insufficient stock for the requested quantity), show a clear dialog/modal BEFORE allowing checkout to proceed: list exactly which items are affected and why (e.g. "Chain - 03 is no longer available" or "Only 2 left of Ring - 01, you had 5 in your cart"), with a clear action like "Remove these items and continue" or "Update quantities and continue."
3. After the customer confirms, automatically adjust the cart (remove unavailable items, reduce quantities to available stock) and recalculate the total before proceeding to the actual checkout/payment step.
4. If a product's PRICE has changed since it was added to the cart, also surface this clearly (e.g. "Price for Chain - 01 has changed from ₹110 to ₹120") rather than silently charging the new price without the customer noticing.
5. Only after this revalidation step passes cleanly (or the customer has confirmed the adjusted cart) should the actual order be created.

## Proof required
1. Confirm the store name/logo header link works across all customer-facing pages.
2. Screenshot of the category tab row showing the new scroll indicator when more categories exist off-screen.
3. Live test: add items to cart, fully close and reopen the browser, confirm the cart is restored intact with the same items and quantities.
4. Live test: add an item to cart, then (as the seller) mark that product as out of stock or delete it, then attempt to checkout as the customer — confirm the revalidation dialog appears, clearly explains what changed, and allows the customer to proceed with a corrected cart.
5. Live test: same as above but for a price change instead of unavailability — confirm the customer is shown the price change clearly before checkout proceeds.
