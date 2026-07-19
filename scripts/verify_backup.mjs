import pkg from '/app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}

async function runTest() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to database. Running Backup Accuracy Verification...");

  try {
    // 1. Create a clean test seller
    const testSubdomain = `test-backup-src-${Date.now()}`;
    const resSeller = await client.query(
      `INSERT INTO sellers (store_name, subdomain, phone, whatsapp_number, subscription_plan) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`Test Src Store`, testSubdomain, `+123${Date.now()}`, `123${Date.now()}`, 'pro']
    );
    const sellerId = resSeller.rows[0].id;
    console.log(`Created test seller ID: ${sellerId}`);

    // 2. Create categories
    const resCat1 = await client.query(
      `INSERT INTO categories (seller_id, name, dozen_discount_percent, bulk_discount_min_qty) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sellerId, 'Cat 1', '10.00', 12]
    );
    const cat1Id = resCat1.rows[0].id;

    const resCat2 = await client.query(
      `INSERT INTO categories (seller_id, name, dozen_discount_percent, bulk_discount_min_qty) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sellerId, 'Cat 2', null, null]
    );
    const cat2Id = resCat2.rows[0].id;

    // 3. Create products
    // Product 1: with category 1, variants, images, custom stock, custom visibility
    const resP1 = await client.query(
      `INSERT INTO products (seller_id, category_id, name, sku, description, price, status, stock_count, show_when_out_of_stock, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [sellerId, cat1Id, 'Product 1', 'SKU-001', 'Desc 1', '100.50', 'active', 50, true, 1]
    );
    const p1Id = resP1.rows[0].id;

    await client.query(
      `INSERT INTO product_images (product_id, url, display_order) VALUES ($1, $2, $3), ($1, $4, $5)`,
      [p1Id, '/objects/uploads/img1.png', 0, '/objects/uploads/img2.png', 1]
    );

    await client.query(
      `INSERT INTO product_variants (product_id, variant_type, options) VALUES ($1, $2, $3)`,
      [p1Id, 'Size', JSON.stringify(['S', 'M', 'L'])]
    );

    // Product 2: with category 2, variants, no images, default stock, default visibility
    const resP2 = await client.query(
      `INSERT INTO products (seller_id, category_id, name, sku, description, price, status, stock_count, show_when_out_of_stock, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [sellerId, cat2Id, 'Product 2', null, null, '250.00', 'out_of_stock', 1, false, 2]
    );
    const p2Id = resP2.rows[0].id;

    await client.query(
      `INSERT INTO product_variants (product_id, variant_type, options) VALUES ($1, $2, $3)`,
      [p2Id, 'Color', JSON.stringify(['Red', 'Blue'])]
    );

    // Product 3: no category, price null (request price), custom stock
    const resP3 = await client.query(
      `INSERT INTO products (seller_id, category_id, name, sku, description, price, status, stock_count, show_when_out_of_stock, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [sellerId, null, 'Product 3', 'SKU-003', 'Desc 3', null, 'hidden', 10, true, 3]
    );
    const p3Id = resP3.rows[0].id;

    console.log("Mock data inserted successfully.");

    // --- SIMULATE EXPORT ---
    console.log("Simulating export...");
    const categories = (await client.query(`SELECT * FROM categories WHERE seller_id = $1`, [sellerId])).rows;
    const products = (await client.query(`SELECT * FROM products WHERE seller_id = $1`, [sellerId])).rows;
    const productIds = products.map(p => p.id);
    const images = (await client.query(`SELECT * FROM product_images WHERE product_id = ANY($1)`, [productIds])).rows;
    const variants = (await client.query(`SELECT * FROM product_variants WHERE product_id = ANY($1)`, [productIds])).rows;

    const exportData = {
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        dozenDiscountPercent: c.dozen_discount_percent,
        bulkDiscountMinQty: c.bulk_discount_min_qty
      })),
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        status: p.status,
        categoryId: p.category_id,
        sortOrder: p.sort_order,
        stockCount: p.stock_count,
        showWhenOutOfStock: p.show_when_out_of_stock,
        images: images.filter(i => i.product_id === p.id).map(i => ({ url: i.url, displayOrder: i.display_order })),
        variants: variants.filter(v => v.product_id === p.id).map(v => ({ variantType: v.variant_type, options: v.options }))
      }))
    };

    // --- SIMULATE IMPORT ---
    console.log("Simulating import to a new test seller...");
    const dstSubdomain = `test-backup-dst-${Date.now()}`;
    const resDstSeller = await client.query(
      `INSERT INTO sellers (store_name, subdomain, phone, whatsapp_number, subscription_plan) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`Test Dst Store`, dstSubdomain, `+765${Date.now()}`, `765${Date.now()}`, 'pro']
    );
    const dstSellerId = resDstSeller.rows[0].id;
    console.log(`Created destination test seller ID: ${dstSellerId}`);

    // Call the import logic (exactly mirrors updated /import-json logic)
    const importCategories = exportData.categories;
    const importProducts = exportData.products;

    const catIdMap = new Map();
    for (const cat of importCategories) {
      // Re-create category dynamically if missing
      const resNewCat = await client.query(
        `INSERT INTO categories (seller_id, name, dozen_discount_percent, bulk_discount_min_qty) VALUES ($1, $2, $3, $4) RETURNING id`,
        [dstSellerId, cat.name, cat.dozenDiscountPercent, cat.bulkDiscountMinQty]
      );
      catIdMap.set(cat.id, resNewCat.rows[0].id);
    }

    for (const p of importProducts) {
      const newCategoryId = p.categoryId != null ? (catIdMap.get(p.categoryId) ?? null) : null;
      const resNewP = await client.query(
        `INSERT INTO products (seller_id, category_id, name, sku, description, price, status, sort_order, stock_count, show_when_out_of_stock) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [dstSellerId, newCategoryId, p.name, p.sku, p.description, p.price, p.status, p.sortOrder, p.stockCount, p.showWhenOutOfStock]
      );
      const newPId = resNewP.rows[0].id;

      if (p.images && p.images.length > 0) {
        for (const img of p.images) {
          await client.query(
            `INSERT INTO product_images (product_id, url, display_order) VALUES ($1, $2, $3)`,
            [newPId, img.url, img.displayOrder]
          );
        }
      }

      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          await client.query(
            `INSERT INTO product_variants (product_id, variant_type, options) VALUES ($1, $2, $3)`,
            [newPId, v.variantType, JSON.stringify(v.options)]
          );
        }
      }
    }

    console.log("Import process complete. Running Assertions...");

    // --- RUN VERIFICATION ASSERTIONS ---
    const dbCats = (await client.query(`SELECT * FROM categories WHERE seller_id = $1 ORDER BY name`, [dstSellerId])).rows;
    const dbProducts = (await client.query(`SELECT * FROM products WHERE seller_id = $1 ORDER BY sort_order`, [dstSellerId])).rows;
    const dbProductIds = dbProducts.map(p => p.id);
    const dbImages = (await client.query(`SELECT * FROM product_images WHERE product_id = ANY($1) ORDER BY display_order`, [dbProductIds])).rows;
    const dbVariants = (await client.query(`SELECT * FROM product_variants WHERE product_id = ANY($1)`, [dbProductIds])).rows;

    // Assert Categories
    if (dbCats.length !== 2) throw new Error(`Category count mismatch: expected 2, got ${dbCats.length}`);
    if (dbCats[0].name !== 'Cat 1' || dbCats[0].dozen_discount_percent !== '10.00' || dbCats[0].bulk_discount_min_qty !== 12) {
      throw new Error(`Cat 1 data mismatch: ${JSON.stringify(dbCats[0])}`);
    }
    if (dbCats[1].name !== 'Cat 2' || dbCats[1].dozen_discount_percent !== null || dbCats[1].bulk_discount_min_qty !== null) {
      throw new Error(`Cat 2 data mismatch: ${JSON.stringify(dbCats[1])}`);
    }
    console.log("✅ Categories & Discount Rules Verification Passed.");

    // Assert Products count
    if (dbProducts.length !== 3) throw new Error(`Product count mismatch: expected 3, got ${dbProducts.length}`);

    // Assert Product 1 details
    const dbP1 = dbProducts.find(p => p.name === 'Product 1');
    if (!dbP1) throw new Error("Product 1 missing after import");
    if (dbP1.sku !== 'SKU-001' || dbP1.description !== 'Desc 1' || dbP1.price !== '100.50' || dbP1.status !== 'active') {
      throw new Error(`Product 1 basic fields mismatch: ${JSON.stringify(dbP1)}`);
    }
    if (dbP1.stock_count !== 50 || dbP1.show_when_out_of_stock !== true) {
      throw new Error(`Product 1 custom stock/visibility mismatch: ${JSON.stringify(dbP1)}`);
    }
    
    // Assert Product 1 Images
    const p1Imgs = dbImages.filter(i => i.product_id === dbP1.id);
    if (p1Imgs.length !== 2) throw new Error(`Product 1 images count mismatch: expected 2, got ${p1Imgs.length}`);
    if (p1Imgs[0].url !== '/objects/uploads/img1.png' || p1Imgs[0].display_order !== 0 ||
        p1Imgs[1].url !== '/objects/uploads/img2.png' || p1Imgs[1].display_order !== 1) {
      throw new Error(`Product 1 images mismatch: ${JSON.stringify(p1Imgs)}`);
    }

    // Assert Product 1 Variants
    const p1Vars = dbVariants.filter(v => v.product_id === dbP1.id);
    if (p1Vars.length !== 1) throw new Error(`Product 1 variants count mismatch: expected 1, got ${p1Vars.length}`);
    if (p1Vars[0].variant_type !== 'Size' || !Array.isArray(p1Vars[0].options) || p1Vars[0].options.length !== 3 || p1Vars[0].options[0] !== 'S' || p1Vars[0].options[2] !== 'L') {
      throw new Error(`Product 1 variants mismatch: ${JSON.stringify(p1Vars[0])}`);
    }
    console.log("✅ Product 1 (Complex attributes, Images, Size Variants & Options) Verification Passed.");

    // Assert Product 2 details
    const dbP2 = dbProducts.find(p => p.name === 'Product 2');
    if (!dbP2) throw new Error("Product 2 missing after import");
    if (dbP2.sku !== null || dbP2.description !== null || dbP2.price !== '250.00' || dbP2.status !== 'out_of_stock') {
      throw new Error(`Product 2 basic fields mismatch: ${JSON.stringify(dbP2)}`);
    }
    if (dbP2.stock_count !== 1 || dbP2.show_when_out_of_stock !== false) {
      throw new Error(`Product 2 custom stock/visibility mismatch: ${JSON.stringify(dbP2)}`);
    }
    
    // Assert Product 2 Variants
    const p2Vars = dbVariants.filter(v => v.product_id === dbP2.id);
    if (p2Vars.length !== 1) throw new Error(`Product 2 variants count mismatch: expected 1, got ${p2Vars.length}`);
    if (p2Vars[0].variant_type !== 'Color' || p2Vars[0].options[0] !== 'Red' || p2Vars[0].options[1] !== 'Blue') {
      throw new Error(`Product 2 variants mismatch: ${JSON.stringify(p2Vars[0])}`);
    }
    console.log("✅ Product 2 (Out of stock status, Color options) Verification Passed.");

    // Assert Product 3 details
    const dbP3 = dbProducts.find(p => p.name === 'Product 3');
    if (!dbP3) throw new Error("Product 3 missing after import");
    if (dbP3.sku !== 'SKU-003' || dbP3.price !== null || dbP3.status !== 'hidden' || dbP3.stock_count !== 10 || dbP3.show_when_out_of_stock !== true) {
      throw new Error(`Product 3 fields mismatch: ${JSON.stringify(dbP3)}`);
    }
    console.log("✅ Product 3 (Request price, custom stock, hidden status) Verification Passed.");

    console.log("\n------------------------------------------------");
    console.log("🎉 BACKUP ACCURACY VERIFICATION PASSED! 100% SUCCESS!");
    console.log("------------------------------------------------\n");

    // Clean up test data
    console.log("Cleaning up test data...");
    await client.query(`DELETE FROM sellers WHERE id IN ($1, $2)`, [sellerId, dstSellerId]);
    console.log("Cleanup complete!");

  } catch (error) {
    console.error("❌ VERIFICATION FAILED:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTest();
