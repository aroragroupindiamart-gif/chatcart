# WAStore Builder — Persistent Seller Login (Reduce OTP Friction + Cost)

Context: Sellers currently have to re-verify via OTP too frequently, creating friction and unnecessary SMS cost. Fix this with a long-lived session, not a literal infinite one (which has its own security/recovery risks).

## Required changes

1. Change the seller session token expiry to a long duration — 180 days (6 months) is a reasonable target. This is NOT the same as "forever" — pick a long but finite expiry, since an unrecoverable infinite session has no path to revoke a lost/stolen device.
2. On every successful authenticated request, if practical, refresh/extend the session expiry (a "rolling" session) so an actively-used account effectively never expires, while a truly abandoned/lost device's session does eventually lapse on its own.
3. The seller should only be asked for OTP again when: (a) their session has genuinely expired from inactivity, (b) they explicitly tap "Logout," or (c) they log in from a new device/browser for the first time.
4. Confirm this doesn't conflict with or weaken any of the existing OTP rate-limiting/lockout security work already built — this change is about session LENGTH after successful login, not about loosening the login/verification process itself.
5. Make sure this same long-lived session works correctly with the PWA setup (if/when built) — a seller opening the installed home-screen icon should land directly in their dashboard, not be asked to re-verify, as long as their session hasn't expired.

## Proof required
1. Confirm the new session expiry duration in the actual token/session configuration code.
2. Log in as a test seller, then simulate returning after a short period (or manually inspect the token's expiry timestamp) to confirm it reflects the new long duration, not the old short one.
3. Confirm explicit logout still works and correctly ends the session (don't break this while fixing the expiry).
