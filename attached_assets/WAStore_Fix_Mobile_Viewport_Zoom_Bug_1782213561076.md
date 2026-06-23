# WAStore Builder — Fix: Seller Dashboard Requires Pinch-to-Zoom on Mobile (Android + iOS, Browser + PWA)

Context: Across multiple screens in the seller dashboard, content appears too small to read comfortably, requiring the user to pinch-to-zoom to see it clearly. This happens in both regular mobile browsers and the installed PWA, on both Android and iOS. This is almost always caused by either a missing/incorrect viewport meta tag, or specific page elements rendering wider than the screen and forcing the whole page to scale down to fit.

## Investigation required

1. **Check the viewport meta tag**: confirm the seller dashboard's HTML head includes `<meta name="viewport" content="width=device-width, initial-scale=1">` (or equivalent). Check if this is missing entirely, present but incorrect, or present but being overridden somewhere.
2. **Check for elements wider than the screen**, specifically on the Orders list page (shown directly in the bug report — note the "View D..." buttons appear cut off on the right edge, suggesting the row content doesn't fit/wrap within the screen width). Check the CSS for: any fixed pixel widths that don't scale down on small screens, any flex/grid rows that don't wrap or shrink their children properly, long unwrapped text (like long Order IDs e.g. "ORD-MQQBTLNU6EBZ") that might be forcing a parent container wider than intended instead of wrapping or truncating.
3. Check whether this is happening across ALL seller dashboard screens equally, or is worse on specific ones (like Orders) — this helps distinguish a global viewport-tag issue from page-specific layout overflow issues, and likely both need addressing.

## Required fix

1. Ensure the correct viewport meta tag is present and not overridden anywhere in the seller dashboard.
2. Fix the Orders list row layout specifically so it fits correctly within the screen width on mobile — likely needs the row to either stack vertically (order ID + details on one line, price/status/button below or restructured) rather than trying to fit everything in one horizontal row, or have the "View Details" button/text adapt (e.g. shrink to just "View" or an icon on narrow screens) so it doesn't get cut off.
3. Audit other seller dashboard screens for the same kind of overflow issue (long IDs, multi-column rows that don't fit) and apply the same fix pattern.
4. Test specifically: does this issue persist in the installed PWA on both Android and iOS, or only in regular mobile browsers? Confirm the fix resolves it in both contexts.

## Proof required
1. Show the actual viewport meta tag currently present (or confirm it was missing) and the fix applied.
2. Screenshot of the Orders list page on a real mobile screen width AFTER the fix, showing all content fitting correctly without needing to zoom — order ID, status badge, price, item count, and the full "View Details" button all visible and properly laid out.
3. Confirm at least 2-3 other dashboard screens (e.g. Products list, Settings, Dashboard home) are also checked and confirmed to display correctly at normal mobile zoom level, not just the Orders page.
4. Confirm this is tested and resolved in the installed PWA context specifically, not just a regular browser tab.
