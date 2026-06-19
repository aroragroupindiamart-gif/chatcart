# WAStore Builder — Fix Pricing Page (Correct Tiers, Remove Custom Domain)

Context: The current pricing page shows outdated tiers (Basic ₹299 / Pro ₹399 / Business ₹499) that don't match the actual implemented plan structure. Replace entirely with the correct, final tier structure below. Also remove "Custom domain support" — this feature does not exist and will not be built; it must not appear anywhere on this page or any other public-facing page.

## Correct pricing content to display

**Starter — ₹99/mo**
"For starting out."
- Up to 25 active products
- WhatsApp ordering
- Search, sort & never lose a product
- Email support (within 24 hours)

**Growth — ₹199/mo** (mark as "Most Popular" / "Recommended")
"For growing businesses."
- Up to 100 active products
- Everything in Starter
- Size, color & custom variants
- Email support (4-6 hour response)

**Pro — ₹299/mo**
"For serious sellers."
- Unlimited products
- Everything in Growth
- Custom store branding (logo + tagline)
- Bulk CSV import
- Monthly store data export
- Up to 3 staff logins
- WhatsApp + phone support, 24/7 instant response

## Required changes
1. Replace all pricing numbers, tier names, and feature lists with the content above exactly.
2. Remove "Custom domain support" completely — confirm it does not appear on this page or anywhere else in the codebase (search for any other mention of "custom domain" in marketing copy and remove it too).
3. Keep the existing visual design (cards, checkmarks, "Most Popular" badge styling) — this is a content correction, not a redesign. Just move the "Most Popular" badge to the Growth tier (middle card) as specified above.
4. Make sure the product limits, variant availability, and support details shown here exactly match what's enforced in the backend (per the Final Plan Tier Structure prompt) — these two need to stay in sync going forward.

## Proof required
Screenshot of the updated pricing page showing all three corrected tiers with accurate pricing and features, and confirmation that no mention of "custom domain" remains anywhere in the public-facing pages.
