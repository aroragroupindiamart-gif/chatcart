# WAStore Builder — Public Marketing Pages

Context: Build the public-facing marketing site (separate from the seller dashboard and customer storefronts). This is the front door for prospective sellers discovering the product. Use the same light theme + single accent color design system already established for the customer storefront, for consistency.

## Pages to build

### 1. Homepage
- Clear headline: what the product does, in one sentence (e.g. "The WhatsApp catalog that never lets you down" or similar — something tied to the core value prop, not generic SaaS language).
- "How it works" — 3-4 simple steps with icons: Add your products → Share your store link → Customers browse & order → Confirm on WhatsApp, your way. Keep this short; sellers skim.
- A short section highlighting the core differentiators (tie back to the original bug list): "Products never disappear," "Find anything in seconds," "Your products, your way — sorted how YOU want."
- Pricing section showing the three tiers (₹299 / ₹399 / ₹499 — confirm current final pricing before building) with a clear feature comparison.
- A prominent "Start Free Trial" or "Get Started" CTA repeated at top and bottom of the page.
- Footer with links to About, Contact, T&C, Privacy Policy, Disclaimer.

### 2. About Us
- Tell the founder story with genuine, specific detail — not generic "we empower small businesses" language. Ground it in the real frustration that led to building this: running a wholesale jewellery business, relying on WhatsApp's catalog daily, hitting the same specific bugs (products vanishing, no search, broken sorting) that real sellers across India hit every day. The specificity is what makes it credible and emotionally resonant.
- Keep it honest and human in tone — this should read like a real person explaining why they built this, not corporate copy.

### 3. Contact Us
- Simple form: name, email/phone, message — submits to a stored `contact_submissions` table (or routes to an email/WhatsApp number, whichever is simpler to wire up reliably).
- Also display a direct WhatsApp contact link/button as an alternative — fitting, given the product's whole premise.

### 4. Terms & Conditions
- Standard SaaS terms: service description, subscription/billing terms, acceptable use, account suspension policy, limitation of liability, governing law (India).
- Flag clearly in the response: this should be reviewed by a lawyer or a proper template service (e.g. Termly, iubenda) before being treated as final — do not present AI-generated legal text as legally vetted.

### 5. Privacy Policy (in addition to what was originally asked — this is necessary, not optional)
- What data is collected (seller account info, customer name/phone at checkout), how it's used, how long it's retained, whether it's shared with third parties (it isn't, beyond required infrastructure providers), and how someone can request deletion of their data — this is a requirement under India's DPDP Act, not just good practice.
- Same flag as above: have this reviewed properly before treating it as final, given it touches real personal data and real legal obligations.

### 6. Disclaimer
- Standard disclaimer: platform facilitates catalog/ordering only, does not process payments, is not a party to the transaction between seller and customer, sellers are independently responsible for their own products/claims/fulfillment.

## Technical notes
- These can be simple, mostly-static pages (no need for the same complexity as the dashboard/storefront) — fast-loading, mobile-first like everything else.
- Use the established light theme and single accent color for visual consistency with the rest of the product.
- All legal pages (T&C, Privacy Policy, Disclaimer) should be easily linkable from the seller signup flow too (e.g. "By signing up you agree to our Terms and Privacy Policy") — confirm this link exists at signup.

## Proof required
Screenshot of each of the 6 pages on both desktop and mobile width.
