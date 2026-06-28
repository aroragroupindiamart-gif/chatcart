# WAStore Builder — Post-Migration Bug Fixes & Feature Checks (7 Items)

Context: Found after the recent migration to DigitalOcean. Several of these may be migration-related regressions (data not fully carrying over correctly), others are pre-existing bugs/missing features that were never fully resolved. Investigate each honestly — do not assume migration caused something if the real cause is different.

---

## ITEM 1 (HIGH PRIORITY — possible data integrity issue) — Category product counts show 0 for all categories

The Settings → Categories page shows "0 products" for every category (Anti Tarnish Chains, Anti Tarnish Rings, Anti Tarnish Sets, Korean Bracelets, Korean Earrings), despite these categories having real products in them (confirmed from earlier testing in this project).

1. Check whether this is purely a DISPLAY bug (the count calculation/query is wrong) or an actual DATA bug (products lost their category_id association during the DO migration).
2. Query the actual products table directly: for a known product that should be in "Anti Tarnish Chains," confirm whether its category_id field is correctly set, null, or pointing to a different/non-existent category ID post-migration.
3. If this is a real data issue from migration, this needs to be fixed by re-establishing the correct category associations, not just fixing the display query.
4. Fix and confirm the category list shows accurate, real product counts matching what's actually in each category.

## ITEM 2 — "Claim your lifetime deal on WhatsApp" button text overflows on mobile

The LTD CTA button text is wider than the button itself and gets cut off at the screen edge on mobile.

1. Fix the button's text sizing/wrapping so the full text is visible and fits properly within the button on mobile screens — either reduce font size responsively, allow the text to wrap to two lines within the button, or shorten the button copy (e.g. "Claim Lifetime Deal") if that fits better.
2. Confirm this displays correctly across a few different mobile screen widths.

## ITEM 3 — Comparison table overflows screen width on mobile

The "Chatcart vs WhatsApp Catalog" table extends past the right edge of the screen on mobile, cutting off the "Chatcart" column content ("Neve...", "archiv...", text getting clipped).

1. Fix the table layout so it fits properly within mobile screen width — options include making the table horizontally scrollable with a clear scroll indicator (consistent with the scroll-indicator pattern already built for category tabs elsewhere in the product), or restructuring the table to stack vertically on narrow screens (e.g. each row becomes a small card with WhatsApp Catalog and Chatcart values stacked, rather than side-by-side columns).
3. Confirm the table is fully readable on mobile with no content cut off or requiring horizontal scroll to read basic information.

## ITEM 4 — SKU field exists but isn't searchable

The SKU field was added previously, with search-by-SKU specified as part of that feature. Confirm whether this was ever actually implemented, since it's currently not working.

1. Check the existing product search logic/query — does it currently only search by product name, with SKU never actually added to the search conditions despite being originally specified?
2. Fix the search query to include SKU as a searchable field, consistent with the original specification (search by SKU should work the same way search by name already does, in the same search bar).
3. Live test: search for a product using its exact SKU value and confirm it's found.

## ITEM 5 — Category-wise bulk discount feature can't be found/verified

The category-wise quantity discount feature (configurable threshold + percentage per category) was built previously. Confirm its current real status.

1. Check the Settings/category editor — is the discount configuration UI (minimum quantity + discount percentage fields) actually present and visible right now? If not, investigate whether this was lost/regressed during migration, or was it removed/changed at some point and not communicated.
2. If the UI is missing entirely, restore it.
3. If the UI exists but isn't easily discoverable, confirm exactly where it lives and make sure that's reasonable (e.g. visible directly on each category's edit view, not buried somewhere unexpected).
4. Live re-test the full discount flow end-to-end (same test pattern as originally verified: set a discount, add below-threshold quantity with no discount, add at/above-threshold quantity with discount correctly applied) to confirm this feature still genuinely works post-migration, not just that the UI is visible.

## ITEM 6 (CRITICAL) — Store data export fails with a JSON error, and import doesn't exist

The "Export my store data" Pro-tier feature now fails with a JSON error when triggered. This was previously verified working before migration — investigate why it's now broken. Additionally, no import feature currently exists, which should be added.

1. Investigate the actual JSON error — what specifically is failing? Check whether this is a data-shape issue (e.g. a field with a value that doesn't serialize correctly, like a malformed date or a circular reference), a post-migration environment/config issue (e.g. a missing dependency or environment variable on the new DO server), or something else.
2. Fix the export feature and confirm it produces a valid, complete, correctly-formatted file with real seller data (products, orders) — re-run the original verification test for this feature.
3. Build a corresponding IMPORT feature: allow a Pro-tier seller to upload a previously-exported file and have their store data restored/re-imported. Decide and clearly handle: should import ADD to existing data, or should it require an empty/specific state to avoid creating duplicates? Default to the safer option (warn clearly if importing would create duplicates, or require confirmation) rather than silently risking duplicate/corrupted data.
4. This relates directly to backup/disaster-recovery value for sellers — make sure both export and import are robust, since this is meant to give sellers genuine peace of mind about their data.

## ITEM 7 — No "scroll to top" option on long product lists

With 200-300 products, scrolling back to the top of a long product list (storefront and/or seller dashboard product list — clarify and fix both if applicable) requires excessive manual scrolling.

1. Add a "scroll to top" floating button that appears after the user has scrolled down a reasonable amount (e.g. past 1-2 screen heights), and disappears when near the top.
2. Tapping it should smoothly scroll back to the top of the page.
3. Apply this to both the customer-facing storefront product list and the seller dashboard's product list, since both can have large product counts.

## Proof required for all 7 items
Real screenshots and live test results for each — particularly for Item 1 (show real query results confirming root cause) and Item 6 (show the actual error before the fix, and a real successful export + import test after).
