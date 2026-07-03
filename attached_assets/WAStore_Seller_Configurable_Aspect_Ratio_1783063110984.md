# WAStore Builder — Seller-Configurable Product Image Aspect Ratio (Square vs Portrait)

Context: A real seller (dealing in suits/sarees) has vertical/portrait-format product photography that doesn't display well in the current square-only product grid. This needs to become a seller-level setting — NOT a customer-facing choice — so each seller's entire storefront renders consistently in whichever ratio suits their product photography.

## Required behavior

1. Add a new setting in the seller's Settings page: "Product Image Layout" with two options:
   - **Square (1:1)** — current default, best for jewellery, accessories, general products
   - **Portrait (3:4)** — best for clothing, sarees, suits, fashion photography
2. This is a SINGLE, store-wide setting per seller — not configurable per individual product. The seller picks one ratio, and it applies consistently across their entire storefront's product grid (category views, "All Items" view, search results — everywhere product cards render as a grid).
3. Default every existing seller to "Square (1:1)" (the current behavior) — this change must not alter how any existing seller's storefront looks unless they explicitly opt into Portrait.
4. There is NO customer-facing control for this anywhere — customers simply see whichever ratio the seller has chosen, with no toggle, no option, no way to change it from the storefront.
5. Image display logic: within the seller's chosen ratio, product images should use `object-fit: cover` (or equivalent) so images fill the card cleanly without distortion, cropping intelligently from center rather than stretching or squishing the image.
6. This setting should NOT require re-uploading any existing product photos — it only changes how the existing images are DISPLAYED/cropped within the card, not the stored files themselves.
7. Apply the chosen ratio consistently to: the product grid on the storefront, the "All Items" tab and individual category tabs, and search results. The seller's own product list in the dashboard can remain in its current format (this setting is specifically for the CUSTOMER-facing storefront presentation, not the seller's internal management view).

## Proof required
1. Screenshot of the new "Product Image Layout" setting in the Settings page, showing both options.
2. Screenshot of a test seller's storefront in Square mode (current default) and the same storefront switched to Portrait mode, showing the grid re-rendering with the new ratio.
3. Confirm an existing seller who has NOT changed this setting sees no visual difference from before this feature was added.
4. Confirm the setting applies consistently across category views, All Items, and search results — not just the main product grid.
5. Confirm there is no way for a customer to change or see this as a toggle anywhere on the storefront.
