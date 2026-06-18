# WAStore Builder — Approve & Verify Two Suggested Fixes

Please proceed with both of these suggested tasks. For each, before and after the fix, give me specifics — not just "fixed."

## TASK 1 — Block image uploads not linked to a product

1. Confirm exactly how this gap currently works: can a seller (or any authenticated user) currently call the upload-URL-request endpoint and receive a valid presigned URL WITHOUT it being tied to any real product?
2. Show the fix: require a valid `productId` (one that exists AND belongs to the requesting seller) at the time of requesting the upload URL, not just at the time of attaching the image afterward.
3. Live test: attempt to request an upload URL with no productId, and with a productId belonging to a DIFFERENT seller. Show both being rejected. Then show a valid request (own product) still succeeding.

## TASK 2 — Prevent sellers from seeing each other's account data via the dashboard API

1. First, tell me specifically WHICH endpoint(s) had this gap. Was it seller profile/settings, billing, analytics, or something else? Be specific about what data could have been exposed.
2. Show the actual fix — the missing sellerId scoping that was added.
3. Live test: using two real seller accounts (same pattern as the earlier product/order tenant-isolation tests), have Seller A attempt to access Seller B's account data through the affected endpoint(s). Show the request and the (now-rejected) response.
4. Confirm: was this gap already live in the current deployed/preview version, or was it caught before being reachable? I want to know if this needs to be treated as a "this may have already leaked data" situation or a "caught before exposure" situation.

## After both

Give me a one-paragraph honest summary: were either of these gaps something a real attacker could have exploited in the current state of the app, or were they lower-risk theoretical gaps? I want an honest risk assessment, not just confirmation that fixes were applied.
