# WAStore Builder — Fix: "Pricing" Nav Link Doesn't Scroll to Section

Context: Clicking "Pricing" in the navbar correctly updates the URL to `/#pricing`, but the page does not actually scroll to the pricing section. The link's destination is correct; the scroll behavior itself is broken.

## Investigation needed

This is commonly caused by one of these in a React/client-side-routed app:
1. The pricing section element doesn't actually have `id="pricing"` matching what the link targets — check this first, it's the simplest possible cause.
2. The browser's default hash-scroll behavior doesn't fire correctly with client-side routing (common with React Router/wouter) — if the user is already on the homepage and clicks the Pricing link, some routers don't trigger a native scroll-to-anchor since there's no full page navigation/reload.
3. The pricing section is rendered dynamically/lazily and may not exist in the DOM yet at the moment the scroll attempt happens, causing the scroll target to not be found.

## Required fix

1. Confirm the pricing section element has the correct `id="pricing"` attribute.
2. Implement explicit scroll handling: when the URL hash is `#pricing` (whether from a fresh page load with the hash already in the URL, or from clicking the link while already on the homepage), use JavaScript to scroll smoothly to that element (e.g. `document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })`), rather than relying solely on default browser anchor behavior.
3. Test specifically the scenario in the bug report: starting from the homepage (not a fresh page load), clicking the "Pricing" nav link should scroll smoothly down to the pricing section.
4. Also test: navigating directly to `chatcart.in/#pricing` as a fresh page load (e.g. typing it directly or following a shared link) should also correctly scroll to the pricing section once the page loads.

## Proof required
1. Screen recording or before/after confirmation: clicking "Pricing" from the homepage now visibly scrolls to the pricing section.
2. Confirm the same works when loading `/#pricing` directly as a fresh page load (not just same-page navigation).
