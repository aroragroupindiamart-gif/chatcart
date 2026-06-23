# WAStore Builder — CRITICAL: Admin Panel Showing Completely Blank White Screens

Context: The admin panel (/admin/*) now shows completely blank white screens across all pages, immediately after a recent batch of changes (most recently: WhatsApp link preview meta tags, and the stock revalidation fix for checkout). This was working correctly before that session. A blank white screen on page load (not "no data" but literally nothing rendering) typically means a JavaScript error is crashing the React app before it can mount — this needs to be debugged as a build/render error, not a data-fetching issue.

## Investigation required

1. **Check the browser console for actual JavaScript errors** when loading any admin panel page right now — show the real error message and stack trace. This is the most direct way to find the root cause of a blank-screen crash.
2. **Review what changed in the most recent session that could affect the admin panel** — specifically check:
   - Did the Open Graph / meta tag changes (for the WhatsApp link preview fix) accidentally modify a shared layout/HTML template that the admin panel also uses, in a way that broke something?
   - Did the stock revalidation fix touch any shared code, types, or API response shapes that the admin panel also depends on (e.g. a shared TypeScript type for "product" or "order" that admin components also import)?
   - Check recent commits/changes specifically for anything touching shared/common files (not just files specific to the customer storefront or checkout flow) that could have an unintended side effect on the separate admin app.
3. Confirm whether this is happening on ALL admin pages uniformly (suggesting a top-level crash, e.g. in a layout/root component) or only some pages (suggesting a more localized issue).

## Required fix

1. Identify and fix the actual root cause — a real JS error, not a guess.
2. Confirm the admin panel fully recovers: login screen, Sellers list, Dashboard, Audit Log, Contact — all pages load and render correctly with real data, exactly as previously verified working.
3. As a safeguard against this happening silently again: consider whether a basic error boundary should be added to the admin panel's root layout, so that a future JS error shows a clear "Something went wrong" message with the actual error visible, rather than a silent blank white screen with no indication anything failed.

## Proof required
1. Show the actual browser console error that was causing the blank screen.
2. Explain specifically what recent change caused it.
3. Screenshot of the admin panel now loading correctly across all its pages (Sellers, Dashboard, Orders, Audit Log).
4. Confirm whether an error boundary was added, and if so, demonstrate it by intentionally triggering a test error and showing the fallback message instead of a blank screen.
