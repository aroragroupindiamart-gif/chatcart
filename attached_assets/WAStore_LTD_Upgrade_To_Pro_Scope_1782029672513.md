# WAStore Builder — Update LTD: Pro-Tier Scope (Supersedes Starter-Scoped Version)

Context: The Lifetime Deal was originally built scoped to Starter-tier limits (25 products, no branding). This is now being changed to full PRO-tier scope instead — unlimited products, custom branding, bulk CSV import, monthly data export, multiple staff logins (once that feature exists), AND the 24/7 instant WhatsApp + call support commitment. This is a deliberate decision, understanding it removes the cost ceiling the Starter-scoping was meant to provide — proceed as instructed.

## Required changes

1. Update plan-limit logic: sellers with `plan = lifetime` should now be treated identically to `plan = pro` for ALL feature gating — unlimited products (no 25-product cap), custom branding allowed, bulk CSV import allowed, monthly data export allowed, and (once built) multi-staff login allowed.
2. Update the support-tier display logic: lifetime sellers should see the same "WhatsApp + Phone support, 24/7 instant response" messaging as Pro sellers in Settings/plan display.
3. Update any marketing copy describing the LTD (homepage, dashboard banner) to reflect this — the offer should now clearly communicate "Lifetime access to ALL Pro features, including unlimited products, custom branding, and 24/7 priority support" rather than referencing Starter-level limits.
4. Confirm the existing LTD infrastructure (the `lifetime` enum value, the public `/api/public/ltd-status` endpoint, the admin counter/badge/filter, the dashboard banner, the cap-of-100 logic) all stay exactly as already built — this task ONLY changes what feature tier `lifetime` maps to internally, not the purchase flow, counter, or admin management already shipped.
5. Live re-test: confirm a `lifetime` seller can now successfully use a Pro-only feature (e.g. save custom branding) where the PREVIOUS version of this task correctly blocked it — this is the key behavior change to verify.

## Proof required
1. Show the updated plan-limit/gating logic confirming `lifetime` now maps to the same permissions as `pro`.
2. Live test: as a lifetime-plan seller, attempt to save custom branding (logo + tagline) — confirm it now SUCCEEDS (previously this correctly returned `upgradeRequired: true`; confirm that behavior has changed for this specific plan).
3. Live test: as a lifetime-plan seller, attempt to create more than 25 active products — confirm there is now no cap (previously capped at 25, now should be unlimited like Pro).
4. Screenshot of updated marketing/dashboard copy describing the LTD's Pro-level feature set.
