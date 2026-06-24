# WAStore Builder — Gate "Powered by Chatcart" Footer Removal to Pro Plan Only

Context: A real seller asked why "Powered by Chatcart" branding appears on their customer-facing storefront. Decision: this branding stays VISIBLE by default on Starter and Growth plans, and is REMOVED only for sellers on the Pro plan — this becomes a genuine Pro-tier perk (a full white-labeled storefront with no Chatcart branding), not a universal removal.

Note: the storefront footer currently shows literal placeholder/example text ("Powered by Chatcart · ARORA GROUP" was development placeholder content, not a real bug) — this needs to be corrected to show the ACTUAL current seller's name dynamically, not a hardcoded example, regardless of the plan-gating below.

## Required changes

1. Fix the footer to dynamically show "Powered by Chatcart · [Actual Current Seller's Store Name]" using the real seller's own name — confirm this was previously hardcoded/using placeholder example data and fix it to pull the real seller record for whichever store is being viewed.
2. Add plan-based conditional rendering: if the seller's `plan` is `pro` (or `lifetime`, which is scoped to full Pro features per earlier decisions), HIDE the entire "Powered by Chatcart · [Store Name]" footer line entirely from their customer-facing storefront. For `starter` and `growth` plans, keep this line visible as it currently is (once the dynamic-name bug above is fixed).
3. Remove the About/Privacy/Terms/Disclaimer footer LINKS from the customer-facing storefront entirely, for ALL plans (Starter, Growth, Pro) — these are separate from the "Powered by Chatcart" branding text and are being removed unconditionally, not gated by plan. IMPORTANT: do NOT delete the actual About, Privacy Policy, Terms & Conditions, or Disclaimer pages themselves — they remain necessary, real pages and must still exist and be accessible from the main marketing site (chatcart.in/about, /privacy, /terms, /disclaimer or wherever they currently live). This change only removes the FOOTER LINKS to them from the seller storefront page — the pages themselves stay fully intact and linkable from the marketing site's own footer/nav.
4. Add this benefit to the Pro tier's feature list wherever pricing/plan comparisons are shown (pricing page, in-dashboard plan display) — e.g. "Remove 'Powered by Chatcart' branding" as a clearly listed Pro-only perk.
5. When a seller upgrades to Pro (via the existing admin panel plan-change mechanism), confirm their storefront's branding line disappears immediately on their next page load — no separate toggle or extra step needed beyond the plan itself being set to Pro.

## Proof required
1. Confirm the dynamic seller-name fix: show the footer correctly displaying a few different sellers' own actual store names (not a hardcoded one) on Starter/Growth plans.
2. Live test: view a Starter or Growth seller's storefront, confirm "Powered by Chatcart · [Their Real Store Name]" is visible.
3. Live test: upgrade that same seller to Pro via the admin panel, reload their storefront, confirm the "Powered by Chatcart" line is now gone, and confirm the About/Privacy/Terms/Disclaimer links are also absent (consistent across all plans, not just Pro).
4. Confirm chatcart.in/about, /privacy, /terms, and /disclaimer (on the main marketing site) still load correctly and are unaffected by this storefront-footer change.
5. Screenshot of the updated pricing page showing branding removal as a listed Pro-tier benefit.
