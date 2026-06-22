# WAStore Builder — Floating WhatsApp Widget on Homepage

Context: Add a floating WhatsApp chat widget to the marketing homepage so visitors with questions (sales enquiries, pricing questions, support) can instantly open a chat to the business WhatsApp number, rather than needing to find a Contact page first.

WhatsApp number: +919319724678

## Required behavior

1. Add a floating, fixed-position WhatsApp icon button (the standard recognizable WhatsApp logo/icon, green circular button) in the bottom-right corner of the screen, visible on all marketing pages (Home, About, Pricing, Contact) — NOT on the seller dashboard, admin panel, or customer storefronts, since this is specifically for prospective-seller enquiries on the public marketing site.
2. The button should remain visible while scrolling (fixed position, not static) but should not obstruct other key UI elements (e.g. don't overlap the bottom of pricing cards or form fields on the Contact page — adjust z-index and positioning as needed).
3. Tapping the button opens a wa.me link to +919319724678 with a friendly pre-filled message, e.g. "Hi! I'm interested in Chatcart and have a few questions." — pre-filled but editable, so the visitor can adjust before sending.
4. On mobile, this opens the native WhatsApp app directly (standard wa.me behavior). On desktop, it should open WhatsApp Web in a new tab (also standard wa.me behavior — confirm this works correctly, no special handling needed beyond the standard wa.me link format).
5. Add a subtle hover/tap animation (e.g. a slight scale-up or pulse) to make it feel inviting and clearly interactive, consistent with how floating chat widgets typically behave — but keep it tasteful, not distracting or constantly animating in a way that's annoying.
6. Optional but recommended: a small, dismissible tooltip/label next to the icon on first page load (e.g. "Questions? Chat with us!") that disappears after a few seconds or on first interaction, to make the widget's purpose immediately clear to a first-time visitor.

## What NOT to do
- Do not add this widget to the seller dashboard, admin panel, or customer-facing storefronts (/store/:slug) — those have their own separate WhatsApp interactions already built for different purposes (checkout handoff, upgrade prompts) and don't need this general enquiry widget layered on top.
- Do not use any third-party WhatsApp widget library/plugin that requires an external account or paid service — implement this directly as a simple wa.me link with custom styling, consistent with how other WhatsApp links are already built throughout the product.

## Proof required
1. Screenshot of the homepage showing the floating WhatsApp widget in the bottom-right corner.
2. Confirm tapping it opens a wa.me link to +919319724678 with the pre-filled message — show the actual generated URL.
3. Confirm the widget appears consistently across Home, About, Pricing, and Contact pages, and confirm it does NOT appear on the seller dashboard, admin panel, or storefront pages.
4. Confirm the widget remains visible and correctly positioned while scrolling, without overlapping other content.
