# WAStore Builder — Prevent Search Engine Indexing of Private/Sensitive Pages

Context: Customer order confirmation pages, the seller dashboard, and seller login screens contain personal data (customer names, phone numbers, order details) or private business functionality. None of these should ever be indexed by Google or any other search engine, even though some are technically publicly accessible without login (e.g. order confirmation pages, by design, so a customer can view their own order via a direct link).

The public marketing site (homepage, About, Pricing, Contact) and customer-facing storefronts (/store/:slug) SHOULD remain indexable — these are meant to be discoverable.

## Required changes

1. Add a `<meta name="robots" content="noindex, nofollow">` tag (or equivalent HTTP `X-Robots-Tag` header) to:
   - All order confirmation pages (`/orders/:orderId` or wherever this currently lives, e.g. `/store/orders/:orderId`)
   - The seller login page and OTP verification page
   - The entire seller dashboard (`/app/*` or wherever it currently lives) — every page under this path
   - The platform admin panel (`/admin/*`) — every page under this path

2. Confirm the marketing site (`/`, `/about`, `/contact`, `/#pricing`) does NOT have a noindex tag — these should remain normally indexable.

3. Confirm customer-facing storefronts (`/store/:slug`) also remain indexable — sellers likely want their store discoverable via search, since that's organic reach for their business. Do not noindex these.

4. Add or update `robots.txt` at the domain root to disallow crawling of `/orders/`, `/app/`, and `/admin/` paths as an additional layer (note: robots.txt alone does not guarantee non-indexing for already-linked pages, so the meta tag/header from step 1 is the primary fix — robots.txt is a supplementary measure).

5. If a sitemap.xml exists or gets created in the future, confirm it only ever includes the marketing pages and storefronts — never order pages, dashboard, or admin paths.

## Proof required

1. Show the actual rendered HTML `<head>` of an order confirmation page, confirming the noindex meta tag is present.
2. Show the same for the seller login page and one seller dashboard page.
3. Show the same for one admin panel page.
4. Confirm the homepage's HTML head does NOT have a noindex tag (i.e. it remains indexable).
5. Show the contents of robots.txt confirming the disallow rules for /orders/, /app/, /admin/.
