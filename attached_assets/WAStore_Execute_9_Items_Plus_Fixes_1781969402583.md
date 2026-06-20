# WAStore Builder — Execute Remaining Items (Assigning as Active Tasks)

Context: Per the audit, 9 of the 10 originally requested items were never actually assigned as a task and no work was done on them. This prompt formally assigns all of them now, plus two new items the audit itself surfaced. Treat everything below as active, assigned work — not background context to reference later.

## NEW ITEM A — Remove "Up to 3 staff logins" from Pro tier pricing

Multi-staff login does not exist in the platform at all (confirmed: single login per seller, no staff table, no routes). Remove this line item from the Pro tier feature list on the pricing page immediately. Do not build multi-staff login as part of this prompt — it will be scoped as its own dedicated task later, since it touches the auth system and deserves isolated, careful implementation rather than being bundled here. For now, just stop advertising a feature that doesn't exist.

## NEW ITEM B — Fix the broken /pricing route (404)

The nav bar's "Pricing" link points to /pricing, which 404s — pricing only exists as a scroll-anchor on the homepage. Either create a real /pricing route that renders the pricing section as its own page, or change the nav link to correctly scroll-anchor to the homepage's pricing section (#pricing) instead of linking to a non-existent route. Pick whichever is simpler given the current architecture, but the nav link must not 404.

## ITEM 1 — Remove "WhatsApp" from prominent branding (now actively assigning)

1. Homepage hero tagline → "The catalog that never lets you down." (remove "WhatsApp")
2. Footer/meta description card → same fix
3. Seller login page subtitle → change "Manage your WhatsApp store" to "Manage your catalogue, your way" (or similar, no "WhatsApp" in this branding context)
4. Leave factual/contextual WhatsApp mentions as-is (About.tsx founder story, Contact.tsx, Privacy.tsx, Disclaimer.tsx, and any "Share to WhatsApp" / "Order on WhatsApp" feature descriptions) — these are correctly left alone per the original brief.

## ITEM 2 — Build the Chatcart vs WhatsApp Catalog comparison table

Add this section to the homepage (between hero and pricing):

| | WhatsApp Catalog | Chatcart |
|---|---|---|
| Products disappearing when marked sold out | Happens randomly (background sync bugs) | Never — archived, never deleted |
| Search your own catalog | Not available | Full search by name |
| Filter by category or status | Not available | Yes |
| Assign category when adding a product | Upload first, edit separately later | Assign category right away |
| New products sort order | Often buried/randomized | Newest-first, or sort manually |
| Manual reorder of products | Not available | Drag-and-drop reorder |
| Size/color/custom variants | Not available | Yes |
| Your own branding (logo, tagline) | Not available | Yes (Pro plan) |
| Bulk import existing catalog | Not available | Yes (Pro plan) |

Use the existing light theme + accent color; WhatsApp Catalog column muted/grey, Chatcart column highlighted with checkmarks.

## ITEM 3 (completion) — Move "Most Popular" badge to Pro

Move the badge from Growth (currently line ~196 of Home.tsx) to Pro. Growth and Starter show as standard cards with no badge.

## ITEM 4 — Serve homepage at root, not /marketing/

Move the marketing site content to be served at `/` directly. Update any internal links currently pointing to `/marketing/`.

## ITEM 5 — Confirm/document final URL structure (subdomains deferred)

Subdomain routing (app.chatcart.in, admin.chatcart.in) is confirmed not feasible to set up reliably on Replit's current path-based artifact routing — this is acceptable and expected; it will be finalized once deployed to DigitalOcean with real DNS control. For now, no further action needed on this item beyond what already exists (/login, /admin paths) — just confirm these current paths remain stable and documented for reference.

## ITEM 6 — Fix seller login page: theme, copy, logo

1. Change from dark theme to the light theme + accent color already established elsewhere in the product.
2. Fix subtitle copy per Item 1 above (don't duplicate the fix, just confirm it's applied here too).
3. Replace the generic Store icon with the actual Chatcart "C" logo already used in the dashboard sidebar and marketing pages.

## ITEM 8 — Add mandatory "All Items" category to every storefront

Add a permanent, built-in "All" tab/view on every seller's storefront showing every active product across all their real categories combined. This should be the default view a customer sees, with real categories available alongside it. Applies even to sellers with only one category.

## ITEM 9 — Product images on order confirmation page + link in WhatsApp message

1. Add the product's primary image to each line item on the order confirmation page (currently text-only).
2. Add a working link to the order confirmation page within the wa.me pre-filled message text (e.g. "View order with photos: chatcart.in/orders/ORD-XXXXX"), so the seller's packing team has a clear visual reference.

## ITEM 10 — Category-wise dozen discount

1. Add `dozen_discount_percent` (nullable numeric) to the `categories` table.
2. Let sellers set/edit this per category from Settings/category management.
3. Cart logic: for each line item (specific product + variant), if quantity >= 12 AND its category has a discount percent set, apply that flat percentage to that line item. Discount rate does NOT increase for multiple dozens — same flat percentage applies once threshold is met, regardless of being 12, 15, or 24+ units. Different products within the same category need their own individual 12+ threshold — quantities are not combined across products.
4. Clearly display the discount (percentage + amount) in cart, checkout, order confirmation, and the WhatsApp message — never silently show a reduced total without explanation.
5. order_items snapshot must store the actual discounted price paid, not the original price.
6. Default assumption: the 12-unit threshold applies per exact product+variant combination (e.g. "Gold Chain A, Size M" needs its own 12 units) — flag this assumption clearly so it can be confirmed or corrected if wrong.

## Proof required for ALL items above
Real screenshots, live test results, or code references for each — consistent with the evidence standard used in every previous round. Do not mark anything "done" without showing it actually working.

## Suggested execution order
Given the volume, work through in this order: New Item A (pricing text fix) → New Item B (route fix) → Item 1 (branding copy) → Item 6 (login page) → Item 3 completion (badge) → Item 4 (homepage root) → Item 2 (comparison table) → Item 8 (All category) → Item 9 (order images/link) → Item 10 (dozen discount, most complex, do last).
