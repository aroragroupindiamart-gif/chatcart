# WAStore Builder — Lifetime Deal (LTD) — Capped at 100, Starter-Tier Scoped

Context: A one-time funding event, not a permanent pricing tier. Sellers can pay ₹9,999 once for lifetime access, capped strictly at the first 100 buyers, after which the offer is removed entirely. To bound long-term hosting cost risk, the LTD grants STARTER-tier feature limits permanently (not Pro/unlimited) — this keeps the maximum possible cost per LTD seller small and predictable regardless of which 100 people buy it.

## TASK 1 — Data model

1. Add `lifetime` as a new value in the seller `plan` enum, alongside the existing `pending | starter | growth | pro`.
2. Add a platform-wide counter or query-based check for "how many sellers currently have plan = lifetime" — this is the live count against the cap of 100.
3. `lifetime` plan sellers get the SAME feature limits as `starter` (25 active products, no variants, no branding, no bulk import, no data export, email support) — reuse all existing Starter-tier gating logic exactly, just under this new plan value. Do not give lifetime sellers Growth or Pro features.
4. No `plan_expires_at` applies to lifetime sellers — their plan never expires (unlike trial/subscription sellers), but their FEATURE limits remain Starter-tier forever.

## TASK 2 — Purchase flow (manual, consistent with current no-self-serve-payment approach)

Since there's no automated payment/billing system yet (consistent with how starter/growth/pro upgrades work — manual, via WhatsApp + the admin panel):

1. Show the LTD offer prominently (styling/placement handled in a separate marketing-page prompt) with a "Get Lifetime Access" button that opens a wa.me chat to the business WhatsApp number, same pattern as other upgrade prompts already built.
2. From the admin panel, you (the platform owner) manually set a seller's plan to `lifetime` once payment is confirmed — reuse the existing subscription editor already built in the admin panel, just add `lifetime` as a selectable option alongside the existing plan values.
3. The admin panel's seller list should show a live "X / 100 lifetime spots claimed" counter somewhere visible (e.g. on the dashboard summary), so you can track remaining availability at a glance and know when to pull the offer down from the marketing site.
4. Once 100 sellers are on `lifetime`, this should be reflected back to you clearly in the admin panel (e.g. the counter visibly maxed out / highlighted) — the actual removal of the offer from the public marketing page is a manual action you'll take (editing the marketing page), not an automatic cutoff, since there's no live payment integration triggering this automatically.

## TASK 3 — In-dashboard upsell for existing trial/active sellers

1. For sellers already on `starter`, `growth`, or `pending` who are actively using the product (e.g., have added at least 1 product, or completed at least 1 order — reuse whatever "engaged" signal makes sense given existing data), show a tasteful, non-intrusive prompt within the dashboard (e.g. in Settings, or as a dismissible banner) offering the LTD: "Loved using Chatcart? Lock in lifetime access for ₹9,999 — only 100 spots, X remaining." This links to the same WhatsApp purchase flow as Task 2.
2. This banner should respect the remaining-spots count — if the cap is reached, this banner should stop appearing anywhere (homepage or dashboard) automatically once the live count hits 100.
3. If a seller already on `starter` upgrades to `lifetime`, their existing products/data/categories must be fully preserved — this is a plan change, not a new account. Confirm this explicitly.

## Proof required
1. Show the updated plan enum including `lifetime`, and confirm Starter-tier feature gating logic is reused correctly for lifetime sellers (test: a lifetime-plan seller attempting to use a Pro-only feature like branding should be rejected, same as a Starter seller).
2. Show the admin panel's live counter reflecting an accurate count of current lifetime sellers out of 100.
3. Demonstrate upgrading an existing test seller (with at least 1 existing product) from `starter` to `lifetime` via the admin panel, and confirm their existing product data is fully intact afterward.
4. Confirm the in-dashboard upsell banner appears for an engaged starter-tier test seller, and links correctly to WhatsApp.
5. Confirm the banner/offer is designed to stop showing once the cap is reached (even if this specific test can't fully simulate 100 real sellers, confirm the counter-check logic is in place and would correctly suppress the offer at 100).
