# WAStore Builder — Critical Bug: Admin Sellers List Shows No Sellers

Context: A real seller signup just happened (phone-based OTP signup, completed successfully, seller can log into their own dashboard and reports being on "starter" plan). However, the Admin Panel's Sellers list (/admin/sellers) shows a completely empty table — no rows at all, despite at least one real seller account existing.

This is a critical, blocking bug: the admin panel's entire purpose (seller management, plan activation, the pending-activation gate workflow) is unusable if sellers don't appear here at all.

## Investigation needed — check each of these specifically

1. **Is the Sellers list API actually being called, and what does it return?** Check the network request the admin panel makes to fetch sellers (e.g. `GET /api/admin/sellers`) — show the actual raw response. Is it returning an empty array `[]`, an error, or real data that the frontend is failing to render?
2. **If the API returns real data but the table is still empty**: this is a frontend rendering bug — check the table component for a bug in how it maps/displays the response.
3. **If the API genuinely returns an empty array**: check the actual database directly — run `SELECT id, store_name, phone, plan, created_at FROM sellers ORDER BY created_at DESC LIMIT 10` and show the real raw output. Does the real seller who just signed up actually exist as a row in this table?
4. **Check the admin authentication/authorization on this specific endpoint** — is it possible the admin API call is being filtered by some default parameter (e.g. a status or plan filter defaulting to something that excludes new signups) rather than genuinely showing all sellers?
5. **Re-confirm the actual plan value for this specific new seller** — query the database directly for this seller's row and show the real `plan` column value. Is it actually `pending` (as intended by the Pending Activation Gate) or did it get set to `starter`? This matters separately from the empty-list bug — both need to be checked.

## Required fix

Once the root cause is identified, fix it so that:
1. The admin Sellers list correctly shows ALL sellers, including brand new signups, regardless of their plan or status — this is supposed to be a complete, unfiltered view by default (with the search/filter controls being optional narrowing, not a default exclusion).
2. Confirm the specific real seller who just signed up now appears correctly in this list, with their actual current plan shown accurately.

## Proof required
1. Show the raw API response from the Sellers list endpoint, before and after the fix.
2. Show the raw database query result for the sellers table, including the real seller in question.
3. Screenshot of the admin Sellers page now correctly showing this real seller, with their actual plan value displayed.
4. Explicitly state: was this seller's actual plan `pending` or `starter` at the database level? If it was `starter`, explain why — this would indicate the Pending Activation Gate's default-on-signup logic has a real bug separate from this display issue.
