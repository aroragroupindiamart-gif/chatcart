# WAStore Builder — Make the Seller Dashboard a PWA (Add to Home Screen)

Context: Sellers currently have to open a browser, navigate to the URL, and log in every time they want to manage their store. This creates friction for a tool meant to be used quickly, repeatedly, throughout the day. Turning the seller dashboard into a PWA lets sellers add it to their phone's home screen, opening it like a regular app (own icon, no browser address bar, persistent login) — without building a separate native app.

Scope: this applies to the SELLER DASHBOARD (/app/*) only — not the marketing site, not the customer storefront, not the admin panel. Sellers are the ones who need quick repeated access; customers visit a storefront once per purchase and don't need to "install" anything.

## TASK 1 — Core PWA setup

1. Create a `manifest.json` for the seller dashboard app with: app name ("Chatcart Seller"), short name ("Chatcart"), the existing Chatcart "C" logo as the icon (provide it in the standard required sizes — 192x192 and 512x512 at minimum), theme color and background color matching the established green/light theme, `display: "standalone"` (so it opens without browser chrome), and `start_url` pointing to the seller dashboard's entry point (e.g. `/app/` or wherever login/dashboard correctly routes to based on auth state).
2. Link this manifest from the seller dashboard's HTML head (only the dashboard, not other parts of the site).
3. Implement a basic service worker for the seller dashboard scope only — at minimum, cache static assets (JS/CSS bundles, the logo/icons) so the app shell loads instantly on repeat opens, even on a slow connection. Do not attempt full offline functionality for dynamic data (products, orders) — that's out of scope; this is about fast loading and installability, not offline editing.
4. Ensure HTTPS is active wherever this is tested/deployed (PWAs require HTTPS to register a service worker — confirm this is already true given the current hosting).

## TASK 2 — Confirm persistent login works correctly in the installed PWA context

Note: the 180-day session/token expiry and refresh mechanism were already built and verified in a previous task — this is a confirmation step for the PWA context specifically, not new auth work.

1. Confirm the existing 180-day session token is correctly read/restored when the app is launched from the installed home-screen icon (standalone mode), not just in a normal browser tab — standalone PWA mode sometimes has different storage/cookie behavior than a regular browser tab, so this needs to be explicitly verified in this context, not assumed to work identically.
2. Confirm a seller who installs the PWA, closes it fully, and reopens it from the home screen icon lands directly in their dashboard without being asked for OTP again (assuming their session hasn't expired or they haven't logged out).
3. If anything about standalone/installed mode breaks the existing session persistence (e.g. a different storage partition, a cookie scope issue), flag and fix this specifically — don't silently assume the existing mechanism carries over.

## TASK 3 — Add an in-app "Install" prompt (Android primarily, since iOS doesn't support this)

1. On Android/Chrome, listen for the `beforeinstallprompt` event and show a friendly, dismissible banner/button within the dashboard (e.g. "Add Chatcart to your home screen for faster access") that triggers the native install prompt when tapped.
2. For iOS/Safari, since automatic install prompts aren't supported, show a simple one-time instructional banner instead (e.g. "Tap Share, then 'Add to Home Screen' to install Chatcart") — detect iOS Safari specifically to show this, and don't show the Android-style prompt there since it won't work.
3. Both banners should be dismissible and not reappear every single session once dismissed (store a "dismissed" flag, e.g. in localStorage).

## What NOT to build right now
- No native Android (Play Store) or iOS (App Store) app — this is explicitly a web-based PWA only.
- No offline editing/sync of products or orders — only static asset caching for fast loading.
- No push notifications as part of this task — that's a separate, larger feature if wanted later (and is more limited on iOS specifically).

## Proof required
1. Show the manifest.json content and confirm it's correctly linked in the dashboard's HTML head.
2. Screenshot/recording of the "Add to Home Screen" flow working on an Android device or Android emulator/Chrome DevTools device simulation — confirm the resulting home screen icon and that opening it launches in standalone mode (no browser address bar).
3. Confirm via DevTools or testing that a logged-in seller who closes and reopens the installed app does NOT need to re-enter OTP (unless their session has genuinely expired).
4. Confirm the install banner appears correctly on Android and the instructional banner appears correctly on iOS Safari (or simulated equivalent), and that dismissing either doesn't bring it back every session.
