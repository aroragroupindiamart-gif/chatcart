# WAStore Builder — CRITICAL: Fix WhatsApp Redirect Loop on Order Confirmation Page

Context: The auto-trigger-WhatsApp feature (built recently) fires every time the order confirmation page loads, with no distinction between "just placed an order" and "navigated here via the 'View order with photos' link sent inside the WhatsApp message itself." This creates a redirect loop: tapping that link inside WhatsApp opens the order page, which immediately auto-redirects back to WhatsApp, so the customer (or seller) can never actually view the order details/photos via that link.

## Required fix

The order confirmation page must only auto-trigger the WhatsApp handoff in the SPECIFIC case of having just completed a fresh checkout — not on every visit to that URL.

1. Distinguish between these two cases when the order confirmation page loads:
   - **Case A (fresh checkout)**: the customer just completed "Place Order" and was navigated here directly as part of that flow → auto-trigger WhatsApp should fire (current behavior, keep this).
   - **Case B (revisit/external link)**: the page was loaded via a direct URL visit — e.g. tapping the "View order with photos" link inside an existing WhatsApp message, refreshing the page, or opening a bookmarked/shared link → auto-trigger must NOT fire. The page should simply display the order details and photos normally, with the manual "Send order on WhatsApp" button still available if the user wants to trigger it themselves.

2. Implement this distinction using a reliable method — for example: pass a flag/state when navigating to this page immediately after a successful checkout (e.g. via React Router location state, a query parameter like `?fresh=true` that's only added during the actual checkout navigation, or a sessionStorage flag set right before navigating and cleared/checked on the page) — choose whichever approach fits the existing routing setup, but ensure it cannot be triggered by simply knowing the URL pattern (i.e. someone can't accidentally or deliberately recreate Case A by guessing a query parameter).

3. Confirm: visiting an order confirmation page URL directly (typing it, tapping a previously-sent link, refreshing) NEVER auto-triggers WhatsApp — only the specific, one-time navigation immediately following a successful "Place Order" action does.

## Proof required
1. Live test — Case A: complete a fresh checkout, confirm WhatsApp still auto-triggers correctly as before (don't break the feature that was just built).
2. Live test — Case B: take the resulting order's URL (or the "View order with photos" link from the WhatsApp message), open it in a fresh browser tab/session (simulating tapping the link from WhatsApp), and confirm the order page now displays normally WITHOUT auto-redirecting back to WhatsApp.
3. Confirm the manual "Send order on WhatsApp" button is still visible and functional on the page in Case B, in case the user wants to trigger it themselves.
4. Confirm refreshing the order confirmation page (in either case) does not cause an unwanted auto-redirect.
