# WAStore Builder — CRITICAL: Stock Revalidation Falsely Flags In-Stock Items as Out of Stock

Context: The newly-built checkout revalidation dialog is rendering correctly (UI, messaging, "Got it"/"Go back to cart" buttons all work as designed), but the underlying logic is INCORRECTLY flagging products as "Out of stock" when they are actually in stock and active. A real test showed Chain-01 through Chain-04 all flagged as out of stock and removed from the cart, even though these products are genuinely available (confirmed by the seller). This is a severe regression — if this fires on valid in-stock orders, it can block legitimate checkouts entirely, which is worse than not having revalidation at all.

## Investigation required — check each of these specific possibilities

1. **Check the actual current stock_count and status values for Chain-01 through Chain-04 in the database right now** — query directly and show the real values. Are they genuinely marked out_of_stock/0 stock at the DB level (meaning this is actually correct and something else changed the stock unexpectedly), or are they genuinely active with stock > 0 (meaning the revalidation query itself has a bug)?

2. **If the DB shows these products as correctly in-stock**, the bug is in the revalidation query/logic itself. Check specifically:
   - Is the revalidation check comparing against the WRONG field (e.g. checking `showWhenOutOfStock` instead of `status`, or checking a stale/cached value instead of a fresh DB read)?
   - Is there a query bug similar to the earlier "category shows only 1 of 2 products" issue (a type mismatch, an incorrect WHERE clause, or a join that's failing) — check if this revalidation logic was recently added and whether it's querying the right table/fields correctly.
   - Is the revalidation logic perhaps checking `quantity requested > stock_count` incorrectly (e.g. comparing against 0 stock by mistake, or a default/fallback value of 0 being used when the actual stock fetch fails silently)?
   - Is there a race condition where the revalidation check runs before the product data has fully loaded/fetched, causing it to evaluate against undefined/null values that default to "treat as unavailable"?

3. **Check if this is happening for ALL products on this seller's store, or specifically these 4** — test with a different product not in this list and see if it also gets incorrectly flagged. This will help isolate whether it's a systemic bug (affecting everything) or specific to something about these particular products (e.g. they share a category, or were added to cart in a particular way).

## Required fix

1. Identify and fix the actual root cause of the false positive.
2. Re-test thoroughly: confirm that genuinely in-stock, active products NO LONGER get incorrectly flagged at checkout.
3. Re-confirm the original intended behavior STILL works correctly: a genuinely out-of-stock or deleted product should still correctly trigger this dialog (re-run the original test from the previous task — mark a product out of stock as the seller, then attempt checkout as the customer with that product in cart, confirm it's correctly flagged this time, not falsely).

## Proof required
1. Show the real database values for Chain-01 through Chain-04 (status, stock_count) at the time of this bug.
2. Explain the exact root cause found — be specific about which line of code/logic was wrong, not a vague summary.
3. Live test: add genuinely in-stock products to cart, proceed to checkout, confirm the dialog does NOT appear and the order can be placed successfully.
4. Live test: mark one product genuinely out of stock, attempt checkout with it in cart, confirm the dialog DOES correctly appear only for that specific item, with the rest of a mixed cart unaffected.
