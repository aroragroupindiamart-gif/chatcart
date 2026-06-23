# WAStore Builder — Reduce Checkout Friction: Auto-Trigger WhatsApp on Order Confirmation

Context: Currently, after placing an order, the customer sees the "Order placed!" confirmation page and must tap a separate "Send order on WhatsApp" button. To reduce friction by one tap, the WhatsApp handoff should trigger AUTOMATICALLY the moment the confirmation page loads — but the confirmation page itself and its manual button must remain fully visible and functional as a fallback, in case the automatic trigger fails on some browsers/devices (this matters — automatic redirects to external apps are sometimes blocked or delayed by mobile browsers, so a manual fallback is required, not optional).

## Required behavior

1. When the order confirmation page loads (immediately after a successful "Place Order"), automatically attempt to open the wa.me link (same pre-filled message and seller phone number already working correctly) — e.g. via `window.location.href` or `window.open()` to the wa.me URL, triggered on page mount.
2. The order confirmation page itself must still fully render and remain visible underneath/after this — order ID, items, photos, total, the "Send order on WhatsApp" button — exactly as it does now. Do NOT hide, skip, or rush past this page; it still serves as the visible proof of a successful order and the fallback path.
3. The existing "Send order on WhatsApp" button stays exactly as-is and must still work correctly if tapped manually — this is the safety net if the automatic trigger is blocked, delayed, or silently fails on a given browser/device.
4. Do not show any error or broken state if the automatic trigger doesn't fire for some reason — the customer should simply see the confirmation page with the manual button available, with no indication that anything "failed," since from their perspective the automatic part is just a convenience, not something they're aware exists.
5. Test specifically on mobile Chrome and on an in-app browser context (e.g. a link opened from within Instagram or WhatsApp itself, which uses a restricted in-app browser) — these contexts are the most likely to block or delay automatic external app launches, so confirm the manual fallback genuinely works smoothly in at least one of these restrictive contexts during testing.

## Proof required
1. Live test: complete a real checkout, confirm the WhatsApp app/wa.me link opens automatically without requiring a manual tap, while the order confirmation page is still fully visible and correct.
2. Confirm the manual "Send order on WhatsApp" button still works correctly if tapped (e.g. test in a context where the automatic trigger might not fire, or simply tap it again after the automatic one already fired, to confirm it doesn't break anything).
3. Note any browser/device-specific behavior observed during testing (e.g. if the automatic trigger behaved differently on different browsers).
