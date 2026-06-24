# WAStore Builder — Polish Generic WhatsApp Link Preview (Cannot Be Removed, Only Improved)

Context: When the order confirmation link is shared in a WhatsApp message, WhatsApp automatically generates a link preview card showing the page's Open Graph metadata. This card CANNOT be disabled or removed — that behavior is controlled entirely by WhatsApp's client, not by our website, and applies to any link shared on WhatsApp from any site. The decision here is to keep the preview generic (not seller-branded) but make sure it looks clean, intentional, and professional rather than confusing or unfinished.

## Required changes

1. Confirm the current Open Graph meta tags on the order confirmation page (`/store/orders/:orderId`) show clean, generic, intentional text — not a seller-specific title that might look odd out of context, and not any leftover placeholder text.
2. Suggested generic content:
   - `og:title`: "Chatcart Order Confirmation" (clean and self-explanatory, works regardless of which seller's order it is)
   - `og:description`: "Tap to view your order details and photos."
   - `og:image`: the generic Chatcart logo (not a seller-specific image, since we're keeping this generic per this decision)
3. Confirm this generic preview is CONSISTENT across every order confirmation link, regardless of which seller it belongs to — don't let it vary or accidentally pull in a specific seller's branding for this particular page (that was the alternative we decided against).
4. Double check there is no remaining reference to "Storefront," "Browse the catalog," or any other inconsistent/leftover description text on this specific page's metadata — the current preview shown in the bug report ("Chatcart Storefront — Browse the catalog and order on WhatsApp. chatcart.in") appears to be reusing the STOREFRONT page's metadata rather than dedicated order-confirmation-page metadata, which is likely why it reads oddly out of context on an order confirmation message. Fix this mismatch specifically — the order confirmation page should have its OWN distinct, dedicated meta tags, separate from the storefront page's tags.

## What NOT to do
- Do not attempt to suppress, hide, or remove the WhatsApp preview card itself — this is not technically possible from our side and any attempt to do so (e.g. stripping the URL into plain text, using a URL shortener trick, or any other workaround) risks breaking the working "tap to view order with photos" link functionality. The link must remain a real, clickable, working URL.

## Proof required
1. Show the current vs. updated Open Graph meta tags specifically for the order confirmation page route.
2. Share a real order confirmation link in an actual WhatsApp chat (same way this bug was originally found) and screenshot the resulting preview card, confirming it now shows the clean, generic "Chatcart Order Confirmation" text instead of the mismatched storefront description.
3. Confirm the link itself still works correctly when tapped (opens the real order with photos) — the preview card change must not affect the actual link functionality.
