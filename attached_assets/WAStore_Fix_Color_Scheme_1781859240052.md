# WAStore Builder — Fix: Color Scheme & Contrast Issues

Context: Two related problems need fixing.

1. A genuine bug: on the order confirmation page, item details ("2× Bluetooth Earbuds ₹2,598") and customer details ("Name: Mayank, Phone: ...") are rendered in light grey text on a white card background — barely legible. This needs an immediate contrast fix regardless of any broader theme decision below.

2. A broader design direction correction: switch the storefront's overall theme from dark to LIGHT, modeled on WhatsApp Web's catalog view (not the WhatsApp mobile app, which is dark — these are different references and we're now choosing the Web one). Reference characteristics: white/very light grey background, dark grey/black text for primary content, a single confident accent color (green, similar to WhatsApp's own brand green) used consistently for buttons and links, simple thin dividers between sections instead of heavy filled panels, generous whitespace, minimal nested card-on-card stacking.

## TASK 1 — Fix the immediate contrast bug (do this first, regardless of theme)

On the order confirmation page specifically:
1. Item line text ("2× Bluetooth Earbuds", price) must use dark, high-contrast text on its background — never light grey on white or light grey on light grey.
2. "Your details" (Name, Phone) must use the same high-contrast treatment.
3. Audit the rest of the order confirmation page for any other low-contrast text and fix those too.

## TASK 2 — Switch storefront theme from dark to light

1. Change the customer-facing storefront's default background from dark/near-black to white or very light grey (e.g. #ffffff or #fafafa).
2. Primary text becomes dark (near-black, e.g. #1a1a1a) instead of white.
3. Secondary/muted text (prices' "Copper Electroplated"-style subtext, helper text) becomes a clear mid-grey (e.g. #6b7280) — NOT light grey on white, which is the bug we just fixed. Always check contrast ratio before finalizing a shade.
4. Pick ONE accent color and use it everywhere for buttons, active states, links, and prices — a confident green (similar to WhatsApp's own green, e.g. #25D366 or a close variant) is the recommended choice given the reference. Remove competing accent colors (e.g. the purple/indigo currently used elsewhere) — consolidate to this one accent color across the entire storefront.
5. Replace heavy filled dark/grey panels with simple thin border dividers (1px, light grey) between sections — avoid stacking multiple solid-color panels on top of each other, which currently makes the order confirmation page look visually noisy (grey panel + white panel + dark background + purple text + green button all at once).
6. Apply this same light theme + single accent color consistently across: product grid, product detail page, cart, checkout, and order confirmation — all customer-facing screens should feel like one consistent design system, not different screens with different color logic.

## What stays the same
- The seller admin dashboard is already light theme — no change needed there, but make sure its accent color usage is consistent with whatever single accent color you settle on for the storefront, so the whole product feels unified end to end.
- No changes to layout structure (vertical category sections, brand banner placement, cart/checkout flow) — this task is about color and contrast only, not information architecture.

## Proof required
1. Screenshot of the order confirmation page after the fix — confirm all text is clearly legible against its background.
2. Screenshot of the product grid, product detail page, and cart in the new light theme.
3. Confirm only ONE accent color is used across all customer-facing screens (no leftover purple/indigo anywhere).
