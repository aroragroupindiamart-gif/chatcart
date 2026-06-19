# WAStore Builder — Polish: Photo Upload Progress + Drag-to-Reorder

Context: Two related quality-of-life improvements to the product photo system. Send this AFTER the TypeScript error fix and the photo upload UX fix (one-tap create with queued photos) are both confirmed working — this builds on top of that flow, not instead of it.

---

## TASK 1 — Upload progress bar

On the product edit page (and the New Product form, if photos are being queued/uploaded there per the recent UX fix), show a clear progress indicator for each photo while it's uploading:
1. A progress bar or percentage (even an indeterminate spinner is acceptable if real upload progress percentage isn't easily available from the storage SDK) on each photo's thumbnail tile while it's mid-upload.
2. Once upload completes, the progress indicator disappears and the real thumbnail shows clearly.
3. If an upload fails, show a clear error state on that specific thumbnail (not a generic toast only) with a retry option — the seller should be able to tell at a glance which specific photo failed, not just that "something" failed.

## TASK 2 — Drag-to-reorder product photos

The backend already supports `displayOrder` on `product_images` (confirmed in an earlier audit) — this is a frontend-only task.

1. On the product edit page, let the seller drag and drop photo thumbnails to reorder them.
2. The first photo in the order is the "primary" image — the one shown as the thumbnail in the product list and as the default image on the storefront product card.
3. Save the new order to the backend (`displayOrder` values) either immediately on drop, or via a "Save" action — whichever is simpler to implement correctly; just make sure the new order persists after a page refresh.
4. On mobile (touch devices), make sure drag-and-drop works with touch gestures, not just mouse drag — this matters since sellers will primarily use this on their phones.

## Proof required
1. Screenshot/recording of a photo mid-upload showing the progress indicator.
2. Screenshot/recording of dragging a photo to reorder it, and confirm after a page refresh the new order persisted (show the DB displayOrder values before and after, same format as the earlier reorder test).
3. Confirm this works on a mobile-width viewport with touch-style interaction, not just desktop mouse drag.
