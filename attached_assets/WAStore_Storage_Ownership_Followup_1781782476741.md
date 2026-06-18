# WAStore Builder — Quick Follow-up: Storage Ownership Check

Context: The storage ACL fix (scoping GET /storage/objects/*path down to GET /storage/objects/uploads/:filename with path-traversal rejection) is good, but it only confirms path-prefix scoping, not ownership scoping. Need to confirm one more thing before calling this fully closed.

## Question

When a seller calls `GET /storage/objects/uploads/:filename`, does the backend verify that the requested filename actually belongs to a product/image owned by THAT seller (via a DB lookup joining the file reference back to sellerId), or does it only check that the path starts with `uploads/` and contains no traversal characters (`../` etc)?

In other words: if Seller A is authenticated and knows or guesses the exact filename of an image that was uploaded by Seller B (e.g. from a leaked URL, a predictable naming pattern, or brute-forcing filenames), can Seller A successfully fetch Seller B's file through this endpoint?

## If ownership is NOT currently checked

Add a DB lookup: before serving the file, confirm the filename matches a row in `product_images` (or wherever uploaded file references are stored) whose associated `product.sellerId` equals the requesting seller's ID. Reject with 403/404 if it doesn't match.

## Proof required

Run a live test with two real sellers (as done in the earlier tenant-isolation test): Seller A attempts to fetch a filename that belongs to an image uploaded by Seller B. Show the actual response — confirm it's rejected if ownership checking is added, or confirm clearly if it was already being checked and you just hadn't mentioned it.

## Also flag

Briefly confirm: was the seeded phone number found in `.agents/memory/chatcart-overview.md` just leftover test/seed data, or is there other test/sensitive data sitting in agent memory files that should be cleaned up at the same time?
