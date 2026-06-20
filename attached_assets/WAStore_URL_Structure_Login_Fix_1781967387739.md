# WAStore Builder — Fix: URL Structure, Seller Login Theme, Logo

## TASK 1 — Homepage should be the actual root, not /marketing

Currently the marketing site lives at `/marketing/` as a path. Move it to be the actual root domain homepage:
1. The marketing/homepage content should be served at `/` (root), not `/marketing/`.
2. If `/marketing/` is currently bookmarked or linked anywhere internally, update those links to point to `/`.
3. Confirm: visiting the bare domain now shows the homepage directly, with no `/marketing` in the URL at any point.

## TASK 2 — Establish clear subdomain structure

Set up the following structure (confirm what's feasible now on Replit vs. what needs to wait for production hosting on DigitalOcean — flag clearly which is which):

1. `chatcart.in` (root) → Public marketing homepage, About, Pricing, Contact, T&C, Privacy, Disclaimer.
2. `app.chatcart.in` → Seller login + seller dashboard (currently may be living at the root or an unclear path — move it here).
3. `admin.chatcart.in` → Platform admin panel (the super-admin panel built earlier) — this should NOT be reachable from the main domain or guessable without knowing this specific subdomain.
4. `chatcart.in/store/:slug` → Customer-facing storefronts (unchanged, already working).

If full subdomain-based routing isn't practical to set up on Replit's preview environment right now, implement it as path-based for now (e.g. `/app/login`, `/admin/login`) and clearly flag that the subdomain structure will be finalized once deployed to production hosting with real DNS control. Don't break anything currently working to force subdomain routing prematurely on Replit if it's not reliable there.

## TASK 3 — Fix seller login page theme and copy

1. The seller login page is still using the old dark theme — update it to match the light theme + single accent color already established across the rest of the product (storefront, dashboard).
2. Change "Manage your WhatsApp store" subtitle to "Manage your catalogue, your way" (consistent with the trademark fix in the other prompt — don't duplicate that fix if already done, just confirm it's applied here too).
3. Add the Chatcart logo (the "C" icon already generated and used elsewhere, e.g. on the marketing pages and dashboard sidebar) to the top of the seller login page — currently it's missing here even though it appears elsewhere.

## Proof required
1. Screenshot confirming the homepage now loads at the root domain with no `/marketing` in the URL.
2. Confirm and document the final URL structure for seller login and admin panel (subdomain or path-based, whichever was feasible).
3. Screenshot of the updated seller login page showing the light theme, corrected copy, and the Chatcart logo present.
