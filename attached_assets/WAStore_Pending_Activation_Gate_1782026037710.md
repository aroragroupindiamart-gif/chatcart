# WAStore Builder — Add "Pending Activation" State (Critical Gap)

Context: Currently, new sellers who sign up via OTP are likely defaulted to the "starter" plan automatically, giving them full product access immediately with zero payment or manual approval. This is wrong for the actual business model: sales happen via WhatsApp-led demos, with the platform owner manually assigning a paid plan via the admin panel after a seller agrees to pay. Self-serve signup should NOT equal self-serve activation.

## Required changes

1. Add a new value to the seller `plan` enum: `pending` (or `inactive` — pick whichever fits the existing enum naming convention). This becomes the new DEFAULT value for all new signups, replacing the current default of `starter`.

2. **Dashboard gating for pending sellers**: a seller whose plan is `pending` can still log in (phone OTP signup/login continues to work as-is), but instead of seeing the normal dashboard (Products, Orders, Settings with full functionality), they should see a clear, friendly holding screen — something like: "Thanks for signing up! Your account is being set up. We'll reach out on WhatsApp shortly to get you started." Include your business WhatsApp contact link on this screen so an eager seller can reach out proactively rather than just waiting.

3. **No functional access while pending**: a pending seller should not be able to add products, access settings, or do anything else in the dashboard — the holding screen is the only thing they see until you manually activate them.

4. **Activation is admin-only**: only the platform admin panel (already built) can move a seller from `pending` to `starter`, `growth`, or `pro`. There is no self-serve way for a seller to activate or upgrade their own account — this matches the existing admin panel's manual subscription management, just now starting from `pending` instead of an already-active `starter`.

5. **Admin panel visibility**: in the seller list view (already built in the admin panel), clearly show which sellers are in `pending` status — ideally sorted/filterable so you can quickly see new signups awaiting your attention, since this is now your cue to start a WhatsApp demo conversation with them.

6. **Existing sellers**: do not retroactively change any seller who already has an active starter/growth/pro plan to pending — this only changes the DEFAULT for brand-new signups going forward. Confirm this explicitly so no current test/demo accounts get accidentally locked out.

## Proof required
1. Sign up as a brand-new test seller (fresh phone number) and confirm they land on the "pending" holding screen, not the normal dashboard, immediately after OTP verification.
2. Confirm this pending seller cannot access /app/products, /app/settings, or any other dashboard functionality directly via URL either (not just hidden from navigation — actually blocked server-side, consistent with how other plan-gating has been enforced throughout this project).
3. Show the admin panel correctly displaying this seller as "pending."
4. From the admin panel, manually activate this seller to "starter" and confirm they now see the normal dashboard on their next page load/login.
5. Confirm an existing already-active test seller (e.g. Sharma General Store) was NOT affected by this change and retains their current plan.
