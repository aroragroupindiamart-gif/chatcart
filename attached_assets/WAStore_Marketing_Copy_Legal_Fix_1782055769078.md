# WAStore Builder — Fix: Remove "WhatsApp" From Branding, Add Comparison Table

## TASK 1 — Remove "WhatsApp" from prominent branding/marketing copy (trademark risk)

Using "WhatsApp" prominently in our own tagline/branding creates real trademark risk (implying affiliation with or endorsement by Meta/WhatsApp, which we do not have). Fix everywhere this appears:

1. Homepage hero tagline: change "The WhatsApp catalog that never lets you down." to "The catalog that never lets you down."
2. Footer/meta description card: change "The WhatsApp catalog that never lets you down. Built by sellers, for sellers." to "The catalog that never lets you down. Built by sellers, for sellers."
3. Seller login page: change "Manage your WhatsApp store" to "Manage your catalogue, your way" (or similar — keep it short and avoid the word "WhatsApp" in this prominent branding context).
4. Search the entire codebase (all marketing pages, login screens, meta tags, page titles) for any other prominent use of "WhatsApp" in branding/taglines and flag each instance found.

IMPORTANT — what NOT to remove: factual, lowercase, descriptive mentions of WhatsApp describing the actual product mechanic are fine and should stay exactly as-is — e.g. "Order on WhatsApp", "Share to WhatsApp", "Confirm via WhatsApp", "WhatsApp ordering" as a feature bullet, "WhatsApp + phone support" in pricing. The issue is specifically using "WhatsApp" as part of OUR brand identity/tagline, not describing real integration with the actual WhatsApp service, which is accurate and necessary to mention.

## TASK 2 — Build a "Chatcart vs WhatsApp Catalog" comparison table on the homepage

Add a comparison table section to the homepage (between the hero and pricing sections is a good placement) with this content:

| | WhatsApp Catalog | Chatcart |
|---|---|---|
| Products disappearing when marked sold out | Happens randomly (background sync bugs) | Never — products are archived, never deleted |
| Search your own catalog | Not available | Full search by name |
| Filter by category or status | Not available | Yes |
| Assign category when adding a product | Must upload first, then edit separately | Assign category right away |
| New products sort order | Often buried/randomized | Newest-first by default, or sort manually |
| Manual reorder of products | Not available | Drag-and-drop reorder |
| Size/color/custom variants | Not available | Yes |
| Your own branding (logo, tagline) | Not available | Yes (Pro plan) |
| Bulk import existing catalog | Not available | Yes (Pro plan) |

Use a clean two-column comparison layout (WhatsApp Catalog column in muted/grey styling, Chatcart column highlighted with the brand accent color and checkmarks). Use a red X or muted dash for "not available" rows, green checkmark for Chatcart's column.

## Proof required
1. Screenshot of homepage hero showing the corrected tagline.
2. Screenshot of the footer card with corrected copy.
3. Screenshot of the seller login page with corrected copy.
4. Screenshot of the new comparison table section.
5. List any other instances of "WhatsApp" found in prominent branding copy elsewhere, even if not yet fixed — flag them for review.
