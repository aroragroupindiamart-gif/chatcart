# WAStore Builder — Approve & Verify: Logout + Persistent OTP Lockout

## TASK 1 — Sign out on all devices

1. Confirm current behavior: does calling logout currently invalidate the session/token only on the calling device, or does it leave other active sessions (other devices/tabs) still valid?
2. Fix: ensure logout invalidates the session properly — either by maintaining a server-side session/token blocklist, or by using short-lived tokens with a refresh mechanism where refresh tokens are revoked on logout (whichever fits the current auth approach with the least rework).
3. Live test: log in on two "sessions" (e.g. two separate API token requests for the same seller, simulating two devices). Log out using one. Confirm the OTHER token/session is now also rejected on the next authenticated request — not just the one that called logout.

## TASK 2 — Make OTP lockout state persistent (survive server restarts) — IMPORTANT

Context: the current OTP rate-limiting/lockout (5 failed attempts → 15-min lockout, 3 sends/hour) is stored in-memory, per the original implementation. In-memory state is wiped on every server restart, deploy, or crash — meaning the brute-force protection resets to zero every time the server restarts. This needs to move to persistent storage.

1. Move the failure-count and lockout-until state from in-memory variables into the Postgres database — a simple table (e.g. `otp_rate_limits`: phone, failed_attempts, locked_until, send_count, send_window_started_at) works fine. No new infrastructure (like Redis) is needed for this scale.
2. Confirm all existing logic (5-attempt lockout, 15-min lockout duration, 3-sends-per-hour) still works exactly as before — this is a storage-location change, not a logic change.
3. Live test: trigger a lockout (5 failed attempts) for a test phone number, then RESTART THE SERVER (or simulate equivalent — redeploy / restart the process), then immediately attempt the correct OTP code again. Confirm it is STILL rejected (lockout persisted through the restart) — this is the core proof that matters here.

## After both

Confirm: prior to this fix, was the OTP lockout state ever actually wiped in a real session during our testing (i.e., did a restart already happen at some point that would have quietly reset earlier test lockouts)? Just want to understand if this gap already affected any of our earlier verification rounds.
