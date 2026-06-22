# WAStore Builder — Fix: WhatsApp/Social Link Preview Shows Replit Default Placeholder

Context: When any Chatcart URL is shared in WhatsApp (or any app that generates link previews), it currently shows the generic Replit-generated default: title "Chatcart Storefront", description "Chatcart Storefront — built on Replit. Update this description to reflect the app.", with no custom image. This is because proper Open Graph meta tags have never been set, so WhatsApp falls back to Replit's auto-generated placeholder. This looks unprofessional and appears every time any Chatcart link (especially order confirmation links sent to sellers) is shared.

## Required fix

Add proper Open Graph (and Twitter Card, for broader compatibility) meta tags to the HTML head of every relevant page type — these tags control exactly what title/description/image apps like WhatsApp show in link previews.

1. **Marketing homepage** (`/`): 
   - `og:title`: "Chatcart — The catalog that never lets you down"
   - `og:description`: A short, real description (e.g. "Replace your WhatsApp catalog with a faster, smarter storefront. No vanishing products. No missed orders.")
   - `og:image`: Use the actual Chatcart logo or a proper branded preview image (1200x630px is the standard recommended size for link previews) — create a simple branded image if one doesn't exist yet, don't leave this blank.
   - `og:url`: the canonical homepage URL.

2. **Seller storefronts** (`/store/:slug`):
   - `og:title`: the seller's actual store name (e.g. "Arora Group Wholesale")
   - `og:description`: the seller's actual tagline if set (e.g. "Importer & Wholesaler of Korean & Anti Tarnish Jewellery"), falling back to a generic "Browse our catalog and order on WhatsApp" if no tagline is set.
   - `og:image`: the seller's own uploaded logo/banner image if set, falling back to the generic Chatcart logo if the seller has no branding configured.
   - This must be dynamic per-seller, not a single static tag — each seller's store link should preview with THEIR branding, not a generic Chatcart one.

3. **Order confirmation pages** (`/store/orders/:orderId`) — this is the highest-priority page, since this is the exact link shared in the WhatsApp checkout handoff message:
   - `og:title`: e.g. "Order ORD-XXXXX — [Seller Store Name]"
   - `og:description`: a short summary, e.g. "View your order details and photos"
   - `og:image`: ideally the first product's image from that specific order (nice touch, shows a relevant photo in the preview) — if that's too complex for this pass, falling back to the seller's logo or the generic Chatcart logo is acceptable, but the GENERIC REPLIT PLACEHOLDER must never show.

4. Remove/override whatever default Replit-generated meta tags currently exist globally, replacing them with the page-specific tags above on every route.

## Proof required
1. Show the actual HTML head meta tags now present on: the homepage, one real seller's storefront (e.g. Arora Group Wholesale), and a real order confirmation page.
2. If possible, test using a link preview debugging tool (e.g. Facebook's Sharing Debugger, or simply sharing the link in a real WhatsApp chat as was done to find this bug) to confirm the new preview shows correctly — proper title, description, and a real image, with NO mention of "built on Replit" or "Update this description" anywhere.
3. Confirm this is dynamic per-seller for storefront links, not a single hardcoded title/description across all stores.
