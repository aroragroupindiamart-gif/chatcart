# WAStore Builder — Fix: Broken Image Icon on Storefront

Context: On the customer storefront (dark theme, now live), one product ("Bluetooth Earbuds") shows a small broken-image icon in the corner of its card instead of either a real photo or the clean "no image" placeholder (the house/storefront icon) that other products without photos correctly show (e.g. "USB-C Charging Cable").

This means the `<img>` tag for that product is attempting to load a URL that's failing (404, broken reference, or similar) — it's not the same as "no image set," which is already handled correctly elsewhere.

## Required fix

1. Investigate why "Bluetooth Earbuds" (or whichever seed/demo product is showing this) has a broken image reference. Check: does it have a row in `product_images` pointing to a URL that no longer resolves (e.g. seed data referencing a placeholder URL that was never actually uploaded to storage)?
2. Fix the root cause — likely the seed/demo data needs either a real working image URL or no image reference at all (so it falls back to the clean placeholder like other no-photo products).
3. Add a fallback in the frontend `<img>` rendering itself: if an image URL fails to load (onError), fall back to the same clean placeholder icon used for products with no image at all — so this situation can never visibly show a broken-image icon to a real customer in the future, even if a URL ever becomes invalid for any reason (deleted file, expired link, etc).

## Proof required

Screenshot of the storefront after the fix, showing the previously-broken product now showing either a real image or the clean placeholder — no broken-image icon anywhere on the page.
