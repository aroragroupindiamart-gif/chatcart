# WAStore Builder — Quick Follow-up: Verify Pending Gate + Swap Support Number

## TASK 1 — Replace placeholder WhatsApp number

The `SUPPORT_WHATSAPP` constant on the PendingActivation.tsx page is currently a placeholder. Replace it with the real business WhatsApp number: [INSERT YOUR ACTUAL NUMBER HERE BEFORE SENDING]. Confirm the WhatsApp button on the pending screen now opens a chat to the correct real number.

## TASK 2 — Live verification (real test, not description)

1. Sign up as a genuinely new seller using a fresh/unused phone number. Show the actual screen that appears immediately after OTP verification — confirm it's the pending holding screen, with a real screenshot.
2. While still in pending state, attempt to access a protected API route DIRECTLY (e.g. a raw API call to GET /api/products or similar, bypassing the frontend entirely — using curl, Postman, or browser dev tools network tab). Show the actual response and confirm it returns the 403 PENDING_ACTIVATION error at the API level, not just that the frontend hides the page.
3. From the admin panel, activate this same test seller to "starter" status. Confirm their next page load/login now shows the real dashboard, and that the same direct API call from step 2 now succeeds.

## Proof required
Real screenshots and real API response output for each step above — not a restated summary.
