# WAStore Builder — Verify: Items 4, 8, 9, 10 (Final Confirmation)

Context: These four items were just reported as complete. Before accepting this, confirm each with real, specific evidence — screenshots, live test results, actual code/query output. Do not restate the summary; show proof for each sub-point below.

## ITEM 4 — Marketing site at root, dashboard at /app/

1. Screenshot confirming the bare domain now loads the marketing homepage directly with NO "/marketing" anywhere in the URL bar.
2. Confirm the seller dashboard now lives at /app/ — screenshot of the login page showing /app/ (or /app/login) in the URL.
3. Click through every nav link on the marketing homepage (Home, About, Pricing, Contact) and confirm none of them are broken or point to old paths. List each link and where it actually goes.
4. Confirm the "Get Started" / signup CTA buttons on the marketing site correctly point to the new /app/ path, not an old or broken one.

## ITEM 8 — "All Items" + category tabs on storefront

1. Screenshot of a seller's storefront showing the "All Items" tab plus individual category pills.
2. Confirm clicking "All Items" shows every active product across ALL categories combined (not just one category) — show a count or list proving this.
3. Confirm a seller with only ONE category still shows the "All Items" tab correctly (not broken/missing for single-category sellers).
4. Confirm out-of-stock products (with showWhenOutOfStock=true) still appear correctly within "All Items" with their out-of-stock badge, consistent with existing behavior.

## ITEM 9 — Product images on order confirmation + WhatsApp link

1. Screenshot of an actual order confirmation page showing product thumbnail images next to each line item (not just text).
2. Show the actual full wa.me message text generated for a real test order, and confirm it contains a working clickable link to that order's confirmation page URL.
3. Click that link (or confirm it resolves) and verify it loads the correct, matching order — not a broken or generic link.

## ITEM 10 — Category-wise dozen discount (verify each layer claimed)

This was described as "fully wired end-to-end" across 6 layers — verify each layer independently, not just the end result:

1. **Settings/category editor**: screenshot of a seller setting a discount (e.g. 10%) on a specific category, with the validation behavior shown (e.g. what happens if they enter an invalid value like -5 or 150).
2. **Database**: confirm the `dozen_discount_percent` value is actually saved for that category — show the real DB row.
3. **Cart engine — below threshold**: add 8 units of a product in that discounted category to the cart. Confirm NO discount is applied. Show the cart total.
4. **Cart engine — at threshold**: add 12 units of the SAME product. Confirm the discount IS applied and clearly displayed (percentage + amount saved). Show the cart total before and after.
5. **Cart engine — different product, same category, below its own threshold**: add only 5 units of a DIFFERENT product in the same discounted category. Confirm this second product does NOT get the discount (since quantities aren't combined across products) — this was an explicit rule, verify it's actually implemented this way and not accidentally combining category-wide quantities.
6. **Checkout**: confirm the discounted price (not original price) carries through correctly to the checkout/order summary.
7. **Order snapshot**: query the actual order_items row created from this test order and confirm the price_snapshot field reflects the DISCOUNTED price actually charged, not the original undiscounted price.
8. **WhatsApp message**: confirm the discount is also clearly reflected in the final wa.me message text sent to the seller (so the seller sees the same discounted total the customer saw, not a mismatched number).

## Final question

For each of these 4 items, is there ANYTHING that was simplified, assumed, or only partially implemented compared to what was originally specified? Be specific — this is the question that has surfaced real gaps in every previous round of this project, so answer it carefully rather than defaulting to "no, everything matches exactly."
