# WAStore Builder — Close Out: Server-Side Upload Validation

Context: Everything in Phase 2 is confirmed working except one gap: POST /api/storage/uploads/request-url currently accepts any contentType and any size value — it only checks that the fields are present, not that their values are valid. This was proven live: a text/plain file, a PDF, and a 5.001MB JPEG all received an approved presigned upload URL. Frontend validation is correct, but it can be bypassed by anyone making a direct API call.

## Required fix

1. On `POST /api/storage/uploads/request-url`, before issuing a presigned URL, validate:
   - `contentType` must be exactly one of: `image/jpeg`, `image/png`, `image/webp`. Reject anything else with a 400 and a clear error message.
   - `size` must be a positive number not exceeding 5MB (5 * 1024 * 1024 bytes). Reject anything larger with a 400 and a clear error message.
2. Update the Zod schema for this route to enforce these as actual value constraints (e.g. a Zod enum for contentType, a `.max()` on size), not just presence checks.
3. Do not change the frontend — it's already correct and can stay as the first line of defense for normal users. This fix is specifically about closing the bypass path for direct API calls.

## Proof required

Re-run the exact same live test as before, post-fix, and show the actual responses:
- A `text/plain` file request → should now be rejected (show status code + error message)
- A PDF file request → should now be rejected (show status code + error message)
- A JPEG over 5MB (e.g. 5.001MB) → should now be rejected (show status code + error message)
- A valid JPEG/PNG/WebP under 5MB → should still succeed (show status code + that a presigned URL is still issued)

Confirm all four results, then give a final one-line status: is Phase 2 now fully closed with zero remaining gaps?
