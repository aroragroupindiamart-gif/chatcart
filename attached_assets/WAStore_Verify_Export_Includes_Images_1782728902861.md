# WAStore Builder — Verify: Does Store Data Export/Import Actually Include Product Images?

Context: The "Export my store data" feature produces a JSON file only a few KB in size. Given that product images are typically several hundred KB to a few MB each, a file this small almost certainly contains only image URLs/references, not the actual image files. This needs to be confirmed clearly, and the backup strategy needs to be made genuinely complete.

## Required investigation

1. Open a real exported JSON file and confirm exactly what it contains for each product's images — is it a URL string pointing to DO Spaces, or actual image data (e.g. base64-encoded)?
2. Confirm explicitly: if the DO Spaces bucket storing these images were deleted, lost, or became inaccessible, would re-importing this JSON file restore working images, or would every product show a broken image (since the URLs would point to nothing)?
3. Separately, check the nightly database backup (already confirmed working — pg_dump to DO Spaces) — does this backup ONLY cover the Postgres database (product text data, orders, etc.), or does it also somehow cover the actual image files sitting in the Spaces bucket? These are likely two completely separate things that need to both be backed up for true data safety.

## Required fix — make this a genuinely complete backup system

1. If the export currently only includes image URLs (most likely finding), this needs to be addressed. Two real options:
   - **Option A (more complete, more complex)**: when a seller exports their data, also bundle the actual image files into a downloadable archive (e.g. a .zip alongside the JSON, or a combined archive) — so the export is truly self-contained and would let a seller fully restore their store even if your storage bucket were lost.
   - **Option B (simpler, but must be clearly communicated)**: keep the JSON export as a lightweight text-data backup, but ensure the DO Spaces bucket ITSELF is separately, automatically backed up (e.g. DO Spaces has its own versioning/backup options, or a separate scheduled job that mirrors the bucket contents elsewhere) — and clearly label the JSON export in the UI as "Product & order data export (images are stored separately and backed up automatically)" so sellers aren't misled into thinking this one file is a complete backup.
2. Whichever option is chosen, the seller-facing UI copy for this feature must accurately describe what is and isn't included — do not let sellers believe they have a complete backup if they don't.
3. Confirm whether DO Spaces (the bucket itself) is currently covered by ANY backup/redundancy mechanism at all right now, separate from the nightly Postgres dump — this is the critical missing piece to identify.

## Proof required
1. Show the actual contents of a real exported JSON file (a snippet showing how an image field is represented) to settle definitively whether it's a URL or actual image data.
2. Clearly state: right now, today, before any fix, if the Spaces bucket were lost, what would actually happen to a seller's product photos across the whole platform? Be direct about the real current risk.
3. Confirm whichever fix is chosen (full archive export, or separate bucket backup) actually protects against permanent image loss, and confirm the UI copy is updated to accurately reflect what's covered.
