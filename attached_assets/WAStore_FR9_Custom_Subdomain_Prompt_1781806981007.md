# WAStore Builder — FR-9: Custom Store URL Slug

Context: Currently every seller's store URL is auto-generated as `store<phonenumber>.chatcart.in` (e.g. `store8368484361.chatcart.in`). This is functional but unprofessional — sellers will want to share their store link with customers, and a phone-number-based URL looks unfinished and is hard to remember. This feature lets sellers set a clean, custom slug (e.g. `mike-jewels.chatcart.in`).

The `subdomain` column already exists on the `sellers` table (confirmed in the schema audit). This is primarily a UI + validation + routing task, not a schema change.

---

## TASK 1 — Let sellers choose their own store slug

1. In Settings → Store Details, add an editable "Store URL" field where the seller can type their preferred slug (e.g. `mike-jewels`, `sharma-general`, `rohit-electronics`).
2. Show a live preview below the input of what their full URL will look like: `mike-jewels.chatcart.in` — updating in real time as they type.
3. Validation rules (enforce both client-side and server-side):
   - Lowercase letters, numbers, and hyphens only — no spaces, no special characters, no uppercase.
   - Minimum 3 characters, maximum 30 characters.
   - Cannot start or end with a hyphen.
   - Must be unique across all sellers — if the slug is already taken by another seller, show a clear "This URL is already taken, please try another" error before they save.
   - A small set of reserved slugs that cannot be used: `www`, `api`, `admin`, `store`, `app`, `mail`, `support`, `help`, `chatcart` — reject these with "This URL is reserved, please choose a different one."
4. Once saved, the seller's storefront should be accessible at both the new slug AND the old phone-number-based slug for a transition period (don't hard-break the old URL immediately — just make the new one work too).
5. The slug, once set by the seller, can be changed again later — but warn them: "Changing your store URL will break any links you've already shared with customers. Are you sure?"

## TASK 2 — Routing: make the custom slug actually work

Current state: subdomain routing is not yet implemented — the storefront is currently accessed via a path-based route (`/store/:subdomain`), not an actual subdomain.

For now (pre-DNS wildcard setup), keep using the path-based routing approach (`/store/:slug`) — just update it to use the seller's chosen custom slug instead of the auto-generated phone-number slug. Real wildcard subdomain DNS (`slug.chatcart.in`) is a separate infrastructure task that happens when moving off Replit to production hosting — don't try to implement actual DNS-level subdomain routing on Replit.

So concretely:
- Seller sets slug to `mike-jewels`
- Their storefront is now at `/store/mike-jewels` (not `/store/store8368484361`)
- The Settings page shows their store URL as `chatcart.in/store/mike-jewels` (realistic for now, not the eventual `mike-jewels.chatcart.in` which requires DNS)
- Note clearly in the UI that the subdomain format (`mike-jewels.chatcart.in`) will be activated once the store goes live — for now the link format is `chatcart.in/store/mike-jewels`

## TASK 3 — Update all internal references

1. Everywhere in the app that currently generates or displays the seller's store URL (Settings page, Dashboard "copy store link" if it exists, the Share to WhatsApp button, the storefront itself) — update to use the new custom slug, not the phone-number-based one.
2. The "Share to WhatsApp" / "Copy Chat Link" product button should generate links using the new slug format too.

## What NOT to build right now
- Actual DNS wildcard subdomain routing (`*.chatcart.in`) — this is a hosting/infrastructure task for when you move to DigitalOcean, not something to implement on Replit.
- A slug "marketplace" or public store directory — not in scope.
- Custom full domains (e.g. `mike.com` pointing to the store) — that's a much later feature.

## Proof required
1. Screenshot of the Settings page with the new editable Store URL field and live preview.
2. Demonstrate: set slug to `test-store`, try to set it to the same slug from a second seller account — show the "already taken" error.
3. Demonstrate: try setting slug to `www` or `admin` — show the "reserved" error.
4. Screenshot of the storefront accessible at `/store/test-store` after the slug is set.
5. Confirm the Share to WhatsApp product link now uses the new slug in its URL.
