import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getSellerPlan, getPlanLimits } from "../lib/planLimits.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseCsvRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
}

const VALID_STATUSES = new Set(["active", "out_of_stock", "hidden"]);

router.post(
  "/products/import-csv",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const plan = await getSellerPlan(req.seller!.sellerId);
      const limits = getPlanLimits(plan);
      if (!limits.csvImportEnabled) {
        res.status(403).json({
          error: "Bulk CSV import is available on the Pro plan. Upgrade to import products in bulk.",
          upgradeRequired: true,
        });
        return;
      }

      let csvContent: string;
      if (req.file) {
        csvContent = req.file.buffer.toString("utf-8");
      } else if (typeof req.body?.csvContent === "string") {
        csvContent = req.body.csvContent;
      } else {
        res.status(400).json({ error: "No CSV file provided. Upload a file using the 'file' field (multipart/form-data)." });
        return;
      }

      const rows = parseCsv(csvContent);
      if (rows.length === 0) {
        res.status(400).json({ error: "CSV must have a header row and at least one data row." });
        return;
      }

      const sellerId = req.seller!.sellerId;

      const sellerCategories = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable)
        .where(eq(categoriesTable.sellerId, sellerId));

      const categoryMap = new Map<string, number>();
      for (const cat of sellerCategories) {
        categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
      }

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const name = row["name"]?.trim();
        if (!name) {
          errors.push(`Row ${rowNum}: missing name — skipped`);
          skipped++;
          continue;
        }

        const priceRaw = row["price"]?.trim();
        const price = parseFloat(priceRaw);
        if (!priceRaw || isNaN(price) || price < 0) {
          errors.push(`Row ${rowNum}: invalid price "${priceRaw}" — skipped`);
          skipped++;
          continue;
        }

        const statusRaw = row["status"]?.toLowerCase().trim() || "active";
        if (!VALID_STATUSES.has(statusRaw)) {
          errors.push(`Row ${rowNum}: invalid status "${statusRaw}" — skipped`);
          skipped++;
          continue;
        }

        if (statusRaw === "active" && limits.maxActiveProducts !== null) {
          const [{ count: activeCount }] = await db
            .select({ count: count() })
            .from(productsTable)
            .where(and(eq(productsTable.sellerId, sellerId), eq(productsTable.status, "active")));
          if (activeCount >= limits.maxActiveProducts) {
            errors.push(`Row ${rowNum}: active product limit reached — remaining rows skipped`);
            skipped += rows.length - i;
            break;
          }
        }

        const categoryName = row["category"]?.trim();
        const categoryId = categoryName ? (categoryMap.get(categoryName.toLowerCase()) ?? null) : null;

        try {
          await db.insert(productsTable).values({
            sellerId,
            name,
            description: row["description"]?.trim() || undefined,
            price: String(price),
            status: statusRaw as "active" | "out_of_stock" | "hidden",
            categoryId,
            stockCount: 1,
          });
          imported++;
        } catch (insertErr) {
          errors.push(`Row ${rowNum}: insert failed — ${String(insertErr)}`);
          skipped++;
        }
      }

      res.json({ imported, skipped, errors });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to import CSV" });
    }
  }
);

export default router;
