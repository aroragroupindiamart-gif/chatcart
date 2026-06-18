# WAStore Builder — Phase 2 Closing Verification (Tasks 1 & 2)

Context: The customer storefront, checkout, WhatsApp handoff, order immutability, and tenant isolation have all been verified with real evidence and are confirmed working. Two items from this same phase — OTP rate-limiting and product image upload — were addressed earlier but haven't been re-confirmed with the same level of proof. Confirm both now, the same way: real output, not descriptions.

---

## TASK 1 VERIFICATION — OTP brute-force protection

1. Show the actual rate-limiting code/middleware on `POST /api/auth/verify-otp` (file and relevant lines).
2. Run a live test: attempt to verify an OTP with the wrong code 6 times in a row for the same phone number. Show the actual response/status code for attempts 1 through 6. Confirm attempt 6 is rejected even if I then try the *correct* code immediately after.
3. Confirm what happens to that phone number after the lockout — show the actual lockout duration enforced (should be 15 minutes per the original spec) and what response a new OTP request gets during that window.
4. Show the rate limit on `POST /api/auth/request-otp` as well — run 4 OTP requests for the same phone number within a short window and show that the 4th is rejected.

---

## TASK 2 VERIFICATION — Product image upload

1. Show a real screenshot of the product create/edit form with the image upload section visible.
2. Show a real screenshot of uploading 2+ images to a product, including the thumbnail previews and upload progress state.
3. Confirm reordering images works — show the displayOrder values in the DB before and after dragging one image to a new position.
4. Confirm deleting a single image from a product works without affecting the others — show the DB row count before and after.
5. Show a screenshot of the product list view (admin dashboard) with at least one product showing its actual uploaded photo as a thumbnail, not a placeholder.
6. Confirm file type/size validation actually rejects a bad file — try uploading a non-image file (e.g. a .txt or .pdf) and a file over 5MB, and show the actual error each produces.

---

Once both are confirmed with real evidence, give me a final one-paragraph status: is Phase 2 (the four original critical tasks: OTP security, image upload, WhatsApp handoff number, customer storefront) now fully complete and verified, with no remaining gaps in any of the four? If anything is still incomplete, say so explicitly rather than rounding up to "done."
