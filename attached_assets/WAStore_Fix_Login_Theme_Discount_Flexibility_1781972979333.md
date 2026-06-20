# WAStore Builder — Fix: Login Page Color Theme + Make Discount Threshold Seller-Configurable

## TASK 1 — Fix seller login page color theme (blue → green)

The seller login page currently uses blue/indigo for the header panel, logo badge, and the "Continue" button. This is inconsistent with the established single accent color (green, the same one used on the homepage, pricing page, and dashboard since the earlier color-scheme fix). 

1. Change the header panel background from blue to the same green accent color used elsewhere.
2. Change the logo badge background and the "Continue" button to match the same green.
3. Audit this specific page for any other leftover blue/indigo elements and correct them to the established green.
4. Confirm no other pages have this same leftover-blue issue — check the OTP entry screen (the next step after this one) for the same problem, since it's part of the same login flow and may have the same leftover styling.

## TASK 2 — Make the dozen-discount feature fully seller-configurable (not fixed at 12 units)

Context: The category discount feature currently has the quantity threshold hardcoded at exactly 12 units ("dozen-wise"). This needs to change: the seller should be able to set ANY quantity threshold they choose, per category — not just 12. The discount itself was already correctly built as optional (nullable per category) — this task is specifically about making the THRESHOLD configurable too, not just the percentage.

### Required changes

1. **Database**: add a new column to `categories`, e.g. `bulk_discount_min_qty` (integer, nullable) — alongside the existing `dozen_discount_percent` column (consider renaming this to something more general like `bulk_discount_percent` for clarity, but don't break existing data — if renaming, migrate the existing column's data across, don't lose any seller's existing settings).

2. **Settings/category editor UI**: 
   - Make BOTH fields clearly optional — a seller can leave both blank (no discount at all for that category, this should be the default for new categories).
   - If a seller wants to set a discount, they enter BOTH a quantity threshold (e.g. "6", "12", "20", "50" — any positive whole number) AND a discount percentage (e.g. "10" for 10%).
   - Validate: quantity threshold must be a positive integer (no decimals, no zero, no negative). Discount percentage must be between 0 and 100 (reuse existing validation logic already built for this).
   - Update the UI copy/labels to reflect this is a general bulk-quantity discount, not specifically "dozen" — e.g. "Bulk discount: set a minimum quantity and discount % for this category (optional)" with example placeholder text like "e.g. 10% off when a customer buys 6 or more."
   - The green "X% off 12+" badge shown on category cards should now dynamically show the seller's actual configured threshold, e.g. "15% off 6+" or "10% off 50+" — not hardcoded to "12+".

3. **Cart/discount engine logic**: 
   - Replace the hardcoded `quantity >= 12` check with a dynamic check against that category's configured `bulk_discount_min_qty` value.
   - If a category has no threshold/percentage set (both null), no discount logic runs for products in that category at all — confirm this is the case for any category where the seller hasn't opted in.
   - All other previously-verified behavior stays the same: the check applies per individual product (not combined across products in a category), the discount rate doesn't escalate beyond the set percentage regardless of how far above the threshold the quantity goes, and the order snapshot/WhatsApp message must reflect the correct discounted price exactly as already verified working.

4. **Migration consideration**: any seller who already has a discount configured under the old fixed-12 system (e.g. the Electronics category at 15% used in testing) should have their existing percentage preserved, with their threshold defaulting to 12 (matching what was implicitly true before) — not silently reset to null/no-discount. Confirm this migration step explicitly.

## Proof required

1. Screenshot of the login page (and the OTP screen) now showing the correct green theme throughout.
2. Screenshot of the category editor showing BOTH the quantity threshold and percentage fields, with an example of setting a non-12 value (e.g. 6 or 20).
3. Live test: set a category's bulk discount to "6 units minimum, 10% off." Add 5 units of a product in that category — confirm NO discount. Add 6 units — confirm discount IS applied and correctly calculated.
4. Live test: set a different category's bulk discount to "20 units minimum, 5% off." Confirm this category's threshold is independent and correctly enforced at 20, not 12.
5. Confirm the previously-tested Electronics category (15% off, originally hardcoded at 12) migrated correctly and still shows "15% off 12+" after this change, with its actual threshold now stored as 12 in the new configurable field.
6. Confirm a category with NO discount configured shows no badge and applies no discount logic at any quantity.
