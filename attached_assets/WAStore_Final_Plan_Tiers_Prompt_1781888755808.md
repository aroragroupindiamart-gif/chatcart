# WAStore Builder — Final Plan Tier Structure (Supersedes Earlier Plan Tiers Prompt)

Context: This replaces the limits and feature gating specified in the earlier "Implement Subscription Plan Tiers" prompt. If that prompt was already implemented, update the existing plan/feature-gating code to match the table below exactly — don't rebuild from scratch if the underlying plan-enum/gating infrastructure already exists.

## Final plan definitions (lock these in exactly)

| Feature | Starter (₹99/mo) | Growth (₹199/mo) | Pro (₹299/mo) |
|---|---|---|---|
| Max active products | 25 (strict) | 100 (strict) | Unlimited |
| Staff logins | 1 | 1 | 3 |
| Variants (size/color/custom) | Disabled | Enabled | Enabled |
| Store branding (logo + tagline) | Disabled | Disabled | Enabled |
| Bulk CSV import | Disabled | Disabled | Enabled |
| Monthly store data export | Disabled | Disabled | Enabled |
| Order history | Last 30 days only | Full history | Full history |
| Support channel | Email only | Email only | WhatsApp + Phone call |
| Support response time | Within 24 hours | 4-6 hours | 24/7, instant |

Core features NOT gated by any plan (available on ALL tiers, including Starter): product CRUD, soft-delete/archive, search and filter, manual sort/drag-reorder, Share to WhatsApp, customer storefront, checkout + WhatsApp handoff, basic order list (within the history limit above).

Note on "strict" product limits: Growth tier is hard-capped at exactly 100 active products — not "up to 100ish" or a soft warning. The 101st active product creation attempt must be rejected server-side, same enforcement pattern as Starter's 25 cap. A seller can still have more than 100 total product rows if some are hidden/archived/out-of-stock — the cap applies specifically to products in 'active' status. Confirm this interpretation when implementing (cap on active-status products, not all rows).

## TASK 1 — Update gating logic to match new limits

1. Update product limit enforcement: Starter = 25 (strict, active-status only), Growth = 100 (strict, active-status only), Pro = unlimited.
2. Move store branding gating from Growth+Pro to Pro-only. If a Growth-tier seller currently has branding saved (from before this change), do not delete their existing data, but block further edits unless they're on Pro — show the same upgrade message used elsewhere.
3. Move bulk CSV import gating from Growth+Pro to Pro-only.
4. All other previously-specified gating logic (variants on Growth+Pro, order history limit on Starter, server-side enforcement on every gated endpoint, not just UI hiding) stays as previously built — just confirm it still matches this updated table.

## TASK 2 — Build monthly store data export (new feature, Pro-only)

1. Add a "Export my store data" action in Settings, visible only on Pro (other tiers see it disabled with an upgrade prompt, consistent with other gated features).
2. On trigger, generate a downloadable file (CSV or JSON, whichever is simpler to implement well) containing: the seller's full product list (name, price, description, category, stock, status, variant info), and their order history (order ID, items, customer name/phone, total, date, status).
3. This can be on-demand (seller clicks "Export now") rather than a literal scheduled monthly job for this initial version — a scheduled automatic monthly email/download is a nice-to-have improvement for later, not required now. Flag this simplification clearly in your response so it's understood as the v1 version of this feature.
4. This is a data EXPORT for the seller's own use, not a system backup mechanism — it does not affect or replace any database-level backup practices that should already exist independently of seller plan.

## TASK 3 — Support tier display

1. In Settings (or wherever plan details are shown), display the support channel and response time for the seller's current plan, matching the table above exactly.
2. For Pro sellers, show your actual WhatsApp business number and a "Call us" option prominently as their support channel.
3. For Starter/Growth, show an email address as their support channel, with the appropriate response-time expectation displayed.

## Proof required
1. Show the updated gating logic enforcing exactly 25 (Starter) and exactly 100 (Growth) ACTIVE product limits with a live test for each — including confirming the 26th/101st attempt is rejected.
2. Show store branding now rejecting a Growth-tier save attempt (previously this worked on Growth — confirm it's now Pro-only).
3. Show bulk CSV import now rejecting a Growth-tier attempt (previously this worked on Growth — confirm it's now Pro-only).
4. Demonstrate the new data export feature working on a Pro account, and confirm it's blocked/disabled with an upgrade message on Starter/Growth.
5. Screenshot of the support information display for each of the three plans.
