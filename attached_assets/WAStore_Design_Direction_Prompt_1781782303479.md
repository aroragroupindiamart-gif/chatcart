# WAStore Builder — Storefront Design Direction Update

Context: This is a visual/UX styling update to the existing customer storefront and seller "Add Product" form. It does NOT remove or change any existing functionality, data model, or API behavior already built and verified (product CRUD, states, search, sort, WhatsApp handoff, checkout flow, tenant isolation, etc.). This is purely about how things look and are laid out.

Reference: the visual direction is inspired by WhatsApp Business app's own catalog view (dark theme, vertical category sections, prominent brand banner) — NOT to copy its bugs or limitations, only its visual polish and warmth, which our product already improves on functionally.

---

## TASK 1 — Dark theme as default for the customer storefront

1. Change the customer-facing storefront's default theme to dark: near-black background (e.g. #0a0a0a or #121212, not pure #000), white/light-grey text, and product images on dark card backgrounds.
2. Keep ONE accent color used consistently for interactive elements (buttons, price text, active filter state, links) — do not introduce multiple competing colors. Reuse whatever accent color is already established in the current build unless instructed otherwise.
3. Product photos should sit on a slightly elevated dark card (subtle lighter shade than the page background, e.g. a soft shadow or 1px border) so images stand out — this matters a lot for jewellery/metal-toned and food-photography product shots specifically.
4. The seller admin dashboard can stay as-is (light theme) for now — this task is scoped to the CUSTOMER-facing storefront only, not the admin/seller dashboard.

## TASK 2 — Vertical category-feed layout for product browsing

Current state: a flat product grid with filter pills (All / Electronics / Clothing / etc.) at the top.

New layout: replace this with vertically-stacked category sections, each showing:
- A category name as a section heading (e.g. "Anti Tarnish Rings")
- A "See all" link/button on the right of the heading that expands to a full grid of just that category
- A horizontally-scrollable row of 3-4 product cards as a preview underneath the heading
- Sections stack one after another down the page, in the order the seller has set for their categories (or alphabetical if no order is set yet)

Keep the search bar at the top — search should still work as before, but search results can display as a single flat grid (not category-sectioned), since search is cutting across categories by definition.

If a seller has only one category or no categories assigned to their products, fall back to a single flat grid (no need to force the vertical layout when there's nothing to section).

## TASK 3 — Seller brand banner (NEW small feature)

This is a new addition, not previously specified. Add the following:

1. In the seller dashboard settings, allow the seller to upload a logo/banner image and write a short tagline (e.g. "Importer, Supplier & Wholesaler of Fashion Jewellery" style — free text, reasonable character limit like 100 chars).
2. Both fields are optional — a seller who skips this should see no banner at all on their storefront (not a placeholder/empty banner box).
3. If set, display the banner prominently at the TOP of the customer-facing storefront, above the search bar and category sections: logo image, store name, and tagline.
4. Store the logo using the existing cloud image storage pipeline (same as product images) — no new storage mechanism needed.
5. Add a `bannerImageUrl` (text, nullable) and `tagline` (text, nullable) column to the `sellers` table.

## TASK 4 — Simplify the "Add Product" form

Current state: the add-product form requires multiple fields upfront (name, price, category, stock, etc.).

New behavior:
1. Only "Item name" should be a required field to save a product. Everything else (price, category, photos, stock count, variants, description) becomes optional at creation — sellers can add/edit these afterward from the product's edit screen.
2. A product saved with no price should display "Price on request" (or similar) on the storefront instead of a blank/broken price field — confirm this doesn't break checkout/cart math (a priceless product should probably not be addable to cart yet — show a "Message seller for price" action instead of "Add to cart" in that case).
3. Move the photo upload section to be the first, most prominent element on the Add Product form (matching the reference: a large "Add photos" tap target before any text fields), since this is the natural first instinct for a seller adding a new item.
4. Do NOT remove any existing field from the data model — this is about which fields are *required* vs *optional* at creation time, not about deleting capability.

## What NOT to change in this task
- No changes to the seller dashboard's own visual theme (still light, for now).
- No changes to checkout flow, WhatsApp handoff logic, order data model, tenant isolation, or any backend logic already verified working.
- No changes to the variant system (handled in a separate, already-sent prompt).

## Proof required
1. Screenshot of the storefront in dark theme with at least one category section showing the horizontal scroll preview + "See all."
2. Screenshot of a seller's storefront with a brand banner (logo + tagline) set, and confirm a storefront with no banner set shows nothing in that space (no empty box).
3. Screenshot of the simplified Add Product form showing only "Item name" as required, with the photo upload section appearing first.
4. Confirm: create a product with only a name and no price, save it, and show how it displays on the storefront (price-on-request state) and that "Add to cart" is replaced appropriately for that product.
