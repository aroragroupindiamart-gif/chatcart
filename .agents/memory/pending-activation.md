---
name: Pending activation gate
description: How the pending plan gate works — DB default, API blocking, dashboard holding screen, admin activation flow.
---

## Rule
New seller signups default to `pending` plan. All seller-authenticated API routes block with 403 until admin activates them. Dashboard shows a holding screen instead of any functionality.

**Why:** Business model requires manual WhatsApp demo before activation — self-serve signup must NOT equal self-serve access.

**How to apply:**
- Any new seller-authenticated API route added in future must include `requireActiveSubscription` middleware after `requireAuth`
- The `pending` value is the first in the `subscription_plan` DB enum and the column default
- Existing sellers were left on `starter` — the default change only affects NEW inserts

## DB
- Enum: `subscription_plan` = `['pending', 'starter', 'growth', 'pro']`
- Column default on `sellers.subscription_plan` = `'pending'`

## API (api-server)
- `requireActiveSubscription` exported from `artifacts/api-server/src/lib/planLimits.ts`
- Returns `{ error: "...", code: "PENDING_ACTIVATION" }` with HTTP 403
- Applied to: all routes in products.ts, categories.ts, orders.ts, dashboard.ts, sellers.ts (PATCH /sellers/me)
- NOT applied to: auth routes (GET /auth/me, POST /auth/logout — pending sellers can still log in)
- Admin subscription PATCH accepts `z.enum(["pending","starter","growth","pro"])` — use this to activate sellers

## Dashboard (chatcart-web)
- `ProtectedRoute` checks `(user as any).subscriptionPlan === "pending"` and renders `PendingActivation` full-page component
- `PendingActivation.tsx` has WhatsApp CTA button; support number constant is `SUPPORT_WHATSAPP` at top of file

## Admin (chatcart-admin)
- Sellers list: pending rows have amber highlight + clock badge; "N awaiting activation" banner appears when there are pending sellers
- Plan filter dropdown includes "Pending" option
- SellerDetail subscription editor: plan options = pending/starter/growth/pro, status options match DB enum exactly
