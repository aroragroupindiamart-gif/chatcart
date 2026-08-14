import pg from '/app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client } = pg;

async function test() {
  console.log("--- Testing API endpoints for categoryIds response ---");
  const connectionString = process.env.DATABASE_URL || 'postgresql://chatcart:Chatcart@2026!@postgres:5432/chatcart';
  const client = new Client({ connectionString });
  await client.connect();

  const sellerRes = await client.query("SELECT id, subdomain FROM sellers WHERE subdomain IS NOT NULL AND subscription_plan != 'pending' AND subscription_status = 'active' LIMIT 1");
  if (sellerRes.rowCount === 0) {
    console.log("❌ No sellers with subdomains found.");
    await client.end();
    return;
  }
  const seller = sellerRes.rows[0];
  const subdomain = 'sharma-general';
  console.log(`Using seller subdomain: ${subdomain}`);

  // Fetch from public API endpoint
  const url = `http://localhost:8080/api/public/sellers/${subdomain}/products`;
  console.log(`Fetching public products from: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const products = await res.json();
    console.log(`Successfully fetched ${products.length} products.`);
    if (products.length > 0) {
      console.log("First product sample:", {
        id: products[0].id,
        name: products[0].name,
        categoryId: products[0].categoryId,
        categoryIds: products[0].categoryIds
      });
      if (Array.isArray(products[0].categoryIds)) {
        console.log("✅ SUCCESS: public API returns categoryIds array!");
      } else {
        console.error("❌ FAILURE: public API product does not contain categoryIds array.");
      }
    } else {
      console.log("No products returned, inserting test product to verify public API...");
      // Let's insert a test product
      const catRes = await client.query("SELECT id FROM categories WHERE seller_id = $1 LIMIT 1", [seller.id]);
      let catId = null;
      if (catRes.rowCount > 0) catId = catRes.rows[0].id;
      
      const insertRes = await client.query(
        "INSERT INTO products (seller_id, name, price, status, category_id) VALUES ($1, 'Test Public API Product', 50.00, 'active', $2) RETURNING id",
        [seller.id, catId]
      );
      const prodId = insertRes.rows[0].id;
      if (catId) {
        await client.query("INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)", [prodId, catId]);
      }
      
      const resRetry = await fetch(url);
      const productsRetry = await resRetry.json();
      console.log(`Successfully fetched ${productsRetry.length} products after insertion.`);
      const testProd = productsRetry.find(p => p.id === prodId);
      if (testProd && Array.isArray(testProd.categoryIds)) {
        console.log("✅ SUCCESS: public API returns categoryIds array for dynamically inserted product!");
      } else {
        console.error("❌ FAILURE: public API does not contain categoryIds array.");
      }
      
      // Cleanup
      await client.query("DELETE FROM products WHERE id = $1", [prodId]);
      console.log("Cleaned up test product.");
    }
  } catch (error) {
    console.error("❌ Fetch error:", error.message);
  }

  await client.end();
}

test().catch(console.error);
