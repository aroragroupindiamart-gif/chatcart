# WAStore Builder — Platform Admin Panel (Super Admin)

Context: This is a NEW, separate panel — distinct from the seller dashboard. It's accessible only to the platform owner (you), not to any seller. This requires careful auth separation: a seller logging into their own dashboard must NEVER be able to reach this panel, and this panel's auth must be completely independent of seller OTP login.

## TASK 1 — Super Admin Authentication (build this first, it gates everything else)

1. Create a separate `admin_users` table — NOT part of the `sellers` table. Fields: id, email, password_hash, role (start with just 'super_admin'), created_at, last_login_at.
2. Admin login uses email + password (bcrypt/argon2 hashed), NOT phone OTP — this is a deliberate separation from the seller auth system.
3. Add a SEPARATE route prefix for all admin panel routes and APIs (e.g. `/admin/*` and `/api/admin/*`) with its own auth middleware that checks for a valid admin session — completely independent from the seller auth middleware.
4. Rate-limit admin login attempts the same way OTP login is protected (reuse the same persistent, DB-backed rate-limiting pattern already built for OTP — not in-memory).
5. For now, manually seed one admin user (you) directly in the database — no public admin signup flow should ever exist.

## TASK 2 — Seller Management

1. List all sellers: store name, phone, signup date, subscription plan, subscription status (active/expired/cancelled), subscription start/end dates.
2. Ability to manually set/edit a seller's subscription plan and start/end dates (for now — payment gateway integration is a separate future task, this is manual admin control for now).
3. Ability to suspend a seller (their storefront and dashboard become inaccessible) and reactivate them, with a required reason text field logged each time.
4. Search/filter sellers by name, phone, subscription status.

## TASK 3 — Cross-Store Visibility (full access, as requested)

1. From the admin panel, be able to drill into ANY individual seller's data: their full product list, their full order history, and — for each order — the full customer details already stored (name, phone, items, variants, total).
2. Build a platform-wide order feed: every order across every seller, sortable/filterable by seller, date, status.
3. Build a platform-wide product analytics view: most-added-to-cart products and categories across all sellers (this part can remain aggregate/anonymized at the product level — it doesn't need individual customer attribution to be useful, though raw access to it is still available via Task 3.1/3.2 if needed).

## TASK 4 — Audit Logging (non-negotiable, build this alongside Task 3, not after)

Given the scope of visibility in Task 3, every access to sensitive data through this panel must be logged:
1. Create an `admin_audit_log` table: id, admin_user_id, action (e.g. "viewed_seller_orders", "viewed_customer_details", "suspended_seller"), target_seller_id (nullable), target_order_id (nullable), details (jsonb, free-form context), created_at, ip_address.
2. Log an entry every time an admin views a specific seller's order/customer details, every time a seller is suspended/reactivated, and every time a subscription is manually edited.
3. Build a simple audit log viewer in the admin panel itself — a searchable/filterable list of all logged actions, so there's a record of who (if you ever add more admin users later) looked at what, and when.

## TASK 5 — Platform Health Dashboard

A summary view: total sellers (active/suspended/trial), total orders platform-wide (today/this week/this month), revenue from subscriptions (sum of active plan prices), signup trend over time (simple line chart is fine).

## Security requirements (treat these as mandatory, not optional)
1. This panel's routes/APIs must be completely unreachable by a seller's session token — verify this explicitly with a test (try accessing an `/api/admin/*` route using a valid SELLER auth token, confirm it's rejected).
2. No admin route should ever be reachable without a valid admin session — verify by attempting access with no auth at all.
3. Consider IP allowlisting for admin routes if feasible at this stage (restrict admin panel access to specific known IP addresses) — flag if this is impractical right now and can be added later.

## Proof required
1. Demonstrate admin login (email+password) working, and confirm a seller's OTP-based session cannot access any `/admin` route.
2. Show the seller list, a drill-down into one specific seller's orders/customers, and the platform health dashboard.
3. Demonstrate the audit log recording an entry when you view a specific seller's customer details, and show that log entry in the audit viewer.
4. Confirm the cross-auth-rejection test from Security Requirement #1 with actual request/response evidence.
