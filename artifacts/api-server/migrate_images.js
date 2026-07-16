import { db } from "@workspace/db";
import { productImagesTable } from "@workspace/db/schema";
import { ObjectStorageService } from "./src/lib/objectStorage.js";
import sharp from "sharp";
import { eq } from "drizzle-orm";

const objectStorageService = new ObjectStorageService();

async function run() {
  console.log("Starting image compression migration...");
  const images = await db.select().from(productImagesTable);
  console.log(`Found ${images.length} total product images.`);

  for (const img of images) {
    if (!img.url) continue;

    // Check if it is a local path (starts with /objects/uploads/ or similar)
    if (img.url.startsWith("/objects/uploads/")) {
      const key = img.url.substring(9); // remove '/objects/' prefix
      console.log(`Checking image ${img.id}: ${key}`);

      try {
        const file = await objectStorageService.getObjectEntityFile(img.url);
        const [exists] = await file.exists();
        if (!exists) {
          console.log(`File does not exist in storage: ${key}`);
          continue;
        }

        const [meta] = await file.getMetadata();

        // If the image is not WebP, and it has size over 150 KB, compress it!
        if (meta.contentType !== "image/webp" && meta.size && meta.size > 150 * 1024) {
          console.log(`Compressing image ${img.id} (${(meta.size / 1024).toFixed(1)} KB)...`);
          const [buffer] = await file.download();

          const compressedBuffer = await sharp(buffer)
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          // Upload compressed WebP to a new key
          const newPath = await objectStorageService.uploadFileBuffer(compressedBuffer, "image/webp");
          console.log(`Saved compressed image to: ${newPath}`);

          // Update database URL
          await db
            .update(productImagesTable)
            .set({ url: newPath })
            .where(eq(productImagesTable.id, img.id));

          // Optionally delete the old file to save space
          try {
            await file.delete();
            console.log(`Deleted original file ${key}`);
          } catch (e) {
            console.error(`Failed to delete old file: ${key}`, e);
          }
        } else {
          console.log(`Skipping image ${img.id} (already webp or small: ${(meta.size ? meta.size / 1024 : 0).toFixed(1)} KB)`);
        }
      } catch (err) {
        console.error(`Failed to process image ${img.id}:`, err);
      }
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
