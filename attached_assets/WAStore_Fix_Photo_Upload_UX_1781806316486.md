# WAStore Builder — Fix: Seamless Photo Upload on New Product Form

Context: Currently, the "New Product" form shows a photo upload zone at the top but it's disabled until the product is saved first — it says "Save the product first to add photos" and "Enter a product name below, then tap here." This creates a two-step flow (save → come back and add photos) which breaks the "photo first" experience we designed for. A seller's natural instinct is to add the photo first, then fill in the name and price. The current behavior fights that instinct.

## Required fix

Make the photo upload feel like one continuous action, not two steps. The approach:

1. The moment a seller selects a photo (taps the upload zone), queue it locally (show a thumbnail preview with a pending/waiting indicator) — do NOT require the product to be saved first just to show the preview.

2. When the seller taps "Create" to save the product:
   - Step 1: Create the product record in the DB (as today)
   - Step 2: Immediately and automatically attach any queued/pending photos to the newly created product ID — using the existing upload pipeline (request presigned URL → upload to storage → save to product_images)
   - Step 3: Show the product as fully created with photos attached

3. From the seller's perspective, this should feel like ONE tap ("Create") that saves everything — name, price, AND photos — at once. No "save first, then come back to add photos" moment.

4. While photos are uploading after the Create tap, show a loading/progress state on the form or redirect to the product detail page with an uploading indicator — do not just silently finish in the background with no feedback.

5. If a photo upload fails after the product is already created, show a clear retry option on the product edit page — don't silently lose the queued photo.

## What NOT to change
- The product still needs a DB row/ID before images can be formally attached — that's fine and doesn't need to change architecturally. The fix is purely about making this invisible to the seller through UX sequencing, not about changing the data model.
- All existing upload validation (JPG/PNG/WebP only, max 5MB, server-side enforcement) stays exactly as-is.

## Proof required
Demo the full flow: select a photo BEFORE entering a product name → enter name + price → tap Create → confirm both the product AND the photo are saved in one action, with the photo visible on the product detail page immediately after creation. No "save first" step visible to the seller at any point.
