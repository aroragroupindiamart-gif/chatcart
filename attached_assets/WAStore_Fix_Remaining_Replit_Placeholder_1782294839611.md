# WAStore Builder — Find and Fix ALL Remaining Replit Default Link Previews

Context: A link preview was just found still showing the raw Replit default placeholder: "Chatcart Marketing — built on Replit. Update this description to reflect the app." This is the exact same root cause as a previously-fixed bug, but it's appearing on what looks like a DIFFERENT route/URL than the ones explicitly fixed before (homepage, seller storefronts, order confirmation pages). This means there are still one or more pages/routes on the site that never received proper Open Graph meta tags and are falling back to Replit's auto-generated default.

## Required actions — this needs to be exhaustive this time, not just patch the one instance found

1. Identify EXACTLY which URL/route was being shared when this preview appeared (check what link was actually sent in the WhatsApp message shown in the bug report — it appears to be a "Chatcart Marketing" page, possibly a different subdomain, path, or app deployment than the main homepage that was fixed before).
2. Do a COMPLETE audit of every distinct route/page/app deployment across the entire project — marketing site, seller dashboard, admin panel, storefronts, order pages, and any other deployed app or path that could ever be shared as a link — and check EACH one for whether it has proper, custom Open Graph meta tags or is still showing the raw Replit default.
3. For any route still showing the Replit default placeholder, apply the same fix pattern used previously: a proper `og:title`, `og:description`, and `og:image` specific to that page's actual purpose — not a copy-pasted generic tag, but content that makes sense for what that specific page actually is.
4. Pay specific attention to whether there are MULTIPLE separate Replit deployments/apps in this project (e.g. a "marketing" app separate from the main seller-facing app) — if so, each separate deployment likely needs its OWN Open Graph tags set independently, since fixing one app's HTML head does not affect a different, separately-deployed app.

## Proof required
1. List every distinct route/app/deployment that was checked, and for each, state clearly whether it had proper custom tags already or was still showing the Replit default before this fix.
2. For each one that was broken, show the before (raw Replit default) and after (proper custom tags) Open Graph content.
3. Re-share the SPECIFIC link from the bug report (or an equivalent fresh link from that same page) in an actual WhatsApp chat and screenshot the resulting preview, confirming it now shows proper Chatcart branding/description, not the Replit default.
4. Confirm there are no other untested routes that could still be showing this same placeholder — be thorough, since this is the second time this exact issue has surfaced and it should be fully resolved across the entire project this time, not just for the one link that happened to get noticed.
