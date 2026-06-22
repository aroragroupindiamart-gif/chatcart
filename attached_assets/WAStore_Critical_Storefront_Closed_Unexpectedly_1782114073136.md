# WAStore Builder — CRITICAL: Storefront Closed Itself Without Seller Action

Context: A seller (Arora Group Wholesale, a real test account) saw a toast notification "Closed Chatcart Storefront — Undo" appear on their Dashboard, despite never intentionally tapping any control to close their storefront. This means the storefront went offline (or a close action was triggered) without deliberate seller action. This is a critical trust-breaking bug — the entire point of this platform is to prevent products/stores from disappearing unexpectedly, and this is the platform itself doing exactly that.

## Investigation required — find the actual root cause, this is not optional

1. Is there a "Close Storefront" toggle/button anywhere in the dashboard (Settings, Dashboard quick actions, etc.)? If so, identify exactly where it is and what UI element triggers it.
2. Check if this could have been triggered by an ACCIDENTAL tap — e.g., is this toggle positioned somewhere that could be mistaken for something else, or triggered by a swipe gesture, or a double-tap that wasn't intended to trigger this action?
3. Check the actual sequence of events server-side: look at recent API calls/logs for this seller's account around the time this toast appeared — was there an actual API call made to close the storefront, and if so, what triggered it client-side? Was it a real user tap, or could this have fired automatically/accidentally due to a bug (e.g. a button rendering in an unexpected location, a gesture handler misfiring, or a stray click event from another part of the UI bleeding through)?
4. Check whether this seller's storefront is CURRENTLY actually closed/offline right now as a result of this — if so, that needs to be reversed immediately as part of this investigation, not left in that state while root cause is identified.

## Required fix

1. Identify and fix the actual root cause — whether it's a misplaced/mis-triggered UI control, a buggy gesture handler, or something else.
2. Regardless of root cause, add a confirmation step before this specific action takes effect: closing a storefront should require an explicit confirmation (e.g. "Are you sure you want to close your storefront? Customers won't be able to view or order from it until you reopen it.") — this should never be a single accidental tap away from taking a seller's entire store offline.
3. Confirm the current state of this specific seller's storefront (open/closed) and correct it if it's currently incorrectly closed.

## Proof required
1. Explain exactly what UI element/action triggers "Close Storefront" and where it's located in the current dashboard.
2. Explain the most likely cause of this specific incident — was it an accidental tap, a bug, or something else? Be honest and specific, not speculative.
3. Confirm a confirmation dialog now exists before this action takes effect.
4. Confirm Arora Group Wholesale's storefront is currently open/active right now.

---

# Also include in this same response: Fullscreen Image Tap + Logo Verification

## ITEM 2 — Tap-to-fullscreen still not working on CUSTOMER-facing order confirmation page

Confirmed: product images display correctly on the customer-facing order confirmation page (chatcart.in/store/orders/:id), but tapping a product thumbnail does not open it full-screen. The previous fullscreen-lightbox feature may have only been applied to the seller-side order detail view, not this customer-facing page.

1. Apply the same tap-to-fullscreen lightbox behavior to the CUSTOMER-facing order confirmation page's product thumbnails, consistent with whatever was built for the seller-side view.
2. Live test: tap a product image on the customer-facing order confirmation page and confirm it now opens full-screen.

## ITEM 3 — Re-confirm seller logo upload/display status

A previous report claimed to investigate a missing logo on the "Order placed!" screen, but the screenshot provided as evidence was actually showing the unrelated storefront-closed toast, not a logo issue. Re-confirm directly: for Arora Group Wholesale specifically, does their uploaded logo display correctly on (a) their storefront header, (b) the "Order placed!" confirmation screen, and (c) anywhere else branding appears? Show real screenshots of each, since this was not actually verified in the previous round due to the screenshot mismatch.

## Proof required for items 2 and 3
Real screenshots/recordings for each, tested specifically on the Arora Group Wholesale account.
