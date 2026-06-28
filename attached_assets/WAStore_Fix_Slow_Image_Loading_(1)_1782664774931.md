# WAStore Builder — Fix: Product Images Loading Extremely Slowly on Storefront

Context: Since migrating to DigitalOcean, product images on the customer-facing storefront are loading noticeably slowly (visible in real testing — images appear blank/grey for an extended period before finally rendering). This needs proper investigation, not just one quick guess — check each of the following possibilities in order.

## Investigation required

1. **Check if a CDN is in front of image storage.** Confirm whether DO Spaces' CDN feature is currently enabled for the bucket storing product images. If not enabled, this is very likely the primary cause — every image request is going directly to origin storage with no edge caching, which is meaningfully slower for users far from the storage region. Enable the CDN endpoint if it isn't already, and update image URLs throughout the app to use the CDN endpoint instead of the direct Spaces URL.

2. **Check actual image file sizes being served.** Query a few real product images currently in storage and check their actual file size in MB. If sellers' uploaded photos (often several MB straight from a phone camera) are being served as-is, without any resizing/compression, this is a major contributor. If this is the case:
   - Implement image resizing/compression at upload time (e.g. resize to a reasonable max dimension like 1200px on the longest side, and compress to a reasonable quality like 75-80% for JPEG/WebP) before storing, OR
   - If resizing at upload isn't feasible quickly, at minimum generate and serve a smaller thumbnail/preview-sized version for the storefront product grid specifically (full-size only needed on the product detail page, not the grid view), since the grid is what's shown in the slow-loading screenshot.

3. **Check whether lazy-loading is implemented correctly.** Confirm images use proper lazy-loading (`loading="lazy"` attribute or equivalent) so images far below the visible viewport don't compete for bandwth with images the user can actually see right now. If this isn't implemented, add it.

4. **Check server/proxy configuration for caching headers.** Confirm appropriate cache-control headers are being set on image responses (e.g. allowing browser/CDN caching for a reasonable duration, since product images don't change often) — similar in spirit to other nginx/server config gaps found during the recent migration (CORS, body size limits). Check if this was simply never configured on the new DO setup.

## Required fix

Based on what's actually found in the investigation above, apply the appropriate fix(es) — likely a combination of enabling CDN, adding image compression/resizing, confirming lazy-loading, and setting correct cache headers. Prioritize whichever investigation step reveals the most significant bottleneck first.

## Proof required
1. Report the actual root cause(s) found — be specific (e.g. "images were unresized originals averaging 4.2MB each, no CDN enabled, no cache headers set").
2. Show before/after load time comparison for the same storefront page (e.g. using browser dev tools' Network tab to measure actual image load times before and after the fix).
3. Confirm the fix doesn't degrade image quality to an unacceptable level — products should still look clear and presentable, not visibly blurry or over-compressed.
4. Test on a throttled/slow connection simulation (most browsers' dev tools support this) to confirm meaningful improvement under realistic mobile network conditions, not just on a fast wifi connection.
