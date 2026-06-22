# WAStore Builder — Marketing Page: LTD Section, Comparison Table Redesign, Pricing Urgency

Context: These were requested earlier but not yet built — the LTD backend (plan logic, admin counter, dashboard banner) already exists and works; this task is specifically about the MARKETING/HOMEPAGE presentation layer, which is still missing or incomplete.

## TASK 1 — Add a prominent LTD section to the homepage

1. Add a visually distinct section to the homepage (separate from and in addition to the regular 3-tier pricing cards) specifically promoting the Lifetime Deal. This should feel like a special, limited-time highlight — not just a 4th pricing card blending in with the others.
2. Pull the live remaining-spots count from the existing `/api/public/ltd-status` endpoint (already built) and display it prominently, e.g. "Only 47 of 100 spots left" — this should update based on real data, not be hardcoded.
3. Clearly state what's included: full Pro-tier features (unlimited products, custom branding, bulk import, data export, priority support) for a single one-time payment of ₹9,999 — no recurring fees, ever.
4. CTA button opens the WhatsApp purchase flow (already built/connected for the LTD elsewhere) — reuse that same link/flow here.
5. If the cap is reached (remaining = 0), this section should automatically change to show "Lifetime deal is sold out" rather than a broken or misleading "claim yours" CTA, and the button should be disabled/hidden.

## TASK 2 — Redesign the comparison table (visual polish + new row)

The current "Chatcart vs WhatsApp Catalog" table layout has alignment and visual polish issues (per the screenshot reviewed) and needs an additional row.

1. Improve visual design: consistent column alignment, consistent spacing/padding between rows, a clear visual separation between the "WhatsApp Catalog" and "Chatcart" columns (e.g. a subtle background tint or border on the Chatcart column to draw the eye), and consistent icon sizing/alignment for the X marks and checkmarks (currently appears slightly uneven). Make this feel like a polished, intentional comparison table — clean grid lines, proper vertical alignment of text within each cell, balanced row heights.
2. Add a new row to the existing comparison table: 

| | WhatsApp Catalog | Chatcart |
|---|---|---|
| Product approval time | 15-30 min review delay before going live | Instant — live the moment you publish |

3. Keep all previously specified rows exactly as they are — this is an addition and a visual redesign, not a content rewrite.

## TASK 3 — Pricing urgency: strikethrough pricing + limited-time messaging

1. On the pricing cards (Starter, Growth, Pro), add a visual "was/now" price treatment: a strikethrough higher price next to the current real price, e.g. <s>₹599</s> ₹299, <s>₹399</s> ₹199, etc. — establish a believable "original" price roughly double the current price for this purpose, or use your own judgment on a reasonable anchor price per tier.
2. Add a clear, prominent urgency message near the pricing section, e.g. "Launch pricing ends in 3 days — prices go up after that" or similar — paired with an actual visible countdown if straightforward to implement (a simple days/hours countdown), or at minimum a clear static date-based message if a live countdown is too complex for this pass.
3. Be accurate and consistent: whatever deadline/message is shown should be something the platform owner can actually honor or update — don't hardcode a date that will look broken/expired if this page isn't revisited in 3 days. Use a configurable approach if possible (e.g. a date stored in a simple config rather than hardcoded text), so it can be updated easily without a full redeploy.

## Proof required
1. Screenshot of the new LTD homepage section, showing the live remaining-spots count pulled from the real API.
2. Screenshot of the redesigned comparison table, including the new "Product approval time" row, showing clean alignment and visual polish.
3. Screenshot of the pricing cards showing the strikethrough/urgency treatment.
