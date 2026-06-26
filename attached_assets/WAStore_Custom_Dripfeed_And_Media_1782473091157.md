# WAStore Builder — Custom Drip-Feed Builder + Media Attachments for WhatsApp Campaigns

Context: This extends the existing WhatsApp Marketing tool (Baileys-based, already built with rate limiting, warm-up, reply-gating, and other safeguards — all of that stays exactly as-is). Two additions: (1) a flexible sequence builder where the admin defines their own number of days/steps (not a fixed 8-day template), and (2) the ability to attach media (images, videos, PDFs) to any step in a sequence.

## TASK 1 — Flexible Drip-Feed Sequence Builder

1. Replace any fixed/hardcoded "8 steps" assumption in the sequence creation UI and backend with a fully flexible builder: the admin can add any number of steps, each with its own day-offset (e.g. Day 1, Day 3, Day 7, Day 10 — gaps between steps don't need to be consecutive, the admin sets each step's day-offset independently).
2. The sequence creation form should support: add step, remove step, reorder steps, and set a custom day-offset number for each step (positive integer, validated to ensure sequence stays in ascending order — e.g. prevent Day 5 coming before Day 3 in the step order).
3. All existing reply-gating, warm-up, and rate-limiting logic must continue to work correctly regardless of how many steps or what day-offsets are used — these safeguards should apply generically to "the next due step in this lead's sequence," not be hardcoded to assume exactly 8 steps.
4. Existing/previously-created sequences (e.g. the "Audit Test 8-Day Sequence") should continue to work unaffected by this change — this is an additive capability, not a breaking change to the data model (if the current schema already supports variable steps with day-offsets, this may already mostly work; confirm and adjust the UI to fully expose this flexibility rather than assuming a fixed count).

## TASK 2 — Media Attachments Per Step

1. Add a media upload field to each sequence step in the builder UI — admin can optionally attach ONE media file per step (image, video, or PDF/document). Steps can also remain text-only if no media is attached.
2. Use the existing cloud storage pipeline (same S3/object storage system already used for product images) to store uploaded campaign media — don't build a separate storage mechanism.
3. Enforce sensible upload limits in the admin UI: images up to 5MB, videos up to 16MB (to stay within WhatsApp's inline "media" compression-friendly range, ensuring instant preview rather than requiring document-style download), PDFs/documents up to 100MB. Show clear file size guidance in the UI (e.g. "Videos under 16MB will play instantly in chat; larger files will be sent as a downloadable document instead").
4. When sending a step with an attached image or video, send it as WhatsApp MEDIA (inline, with preview) via Baileys, not as a document — this matters for engagement, since a document requires an extra tap to open. For PDFs or any file naturally meant as a document (not a video/image), send as a WhatsApp DOCUMENT.
5. If a video file is between 16MB and 100MB, automatically send it as a document instead of media (since WhatsApp's inline video media cap is much lower) — and the upload UI should warn the admin about this at the time of upload, not silently change behavior with no explanation.
6. Account for media upload/send time in the existing randomized delay logic — sending media takes longer than plain text (upload to WhatsApp's media servers first), so the existing human-like timing safeguards should naturally accommodate this rather than rushing media sends faster than realistic human behavior.
7. Allow a text caption alongside the media (WhatsApp supports this natively) — the existing step message text should become the caption when media is attached, using the same {{name}}/{{storeName}} template variable substitution already built.

## Proof required
1. Create a custom sequence with non-consecutive day-offsets (e.g. Day 1, Day 4, Day 9) and confirm the scheduler correctly respects these custom offsets, not a fixed daily pattern.
2. Upload an image to a sequence step, send a test message with it, and confirm it arrives as inline media (not a document) with the caption text correctly substituted.
3. Upload a video under 16MB and confirm it sends as inline media; upload one between 16-100MB and confirm it correctly falls back to document mode with the admin having been warned about this at upload time.
4. Confirm existing reply-gating and rate-limiting safeguards still function correctly on this new flexible/media-enabled sequence (re-run the same reply-gate test used in the previous audit, but on a custom sequence with media attached, to confirm nothing regressed).
