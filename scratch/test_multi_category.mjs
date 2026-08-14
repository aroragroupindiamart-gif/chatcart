import pg from '/app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client } = pg;

async function test() {
  console.log("--- Testing Multi-Category Database Integration ---");
  const connectionString = process.env.DATABASE_URL || 'postgresql://chatcart:Chatcart@2026!@postgres:5432/chatcart';
  const client = new Client({ connectionString });
  await client.connect();

  // 1. Fetch an existing seller and check their categories
  const sellerRes = await client.query("SELECT id, store_name FROM sellers LIMIT 1");
  if (sellerRes.rowCount === 0) {
    console.log("❌ No sellers found in the database to test with.");
    await client.end();
    return;
  }
  const sellerId = sellerRes.rows[0].id;
  const storeName = sellerRes.rows[0].store_name;
  console.log(`Using seller: ${storeName} (ID: ${sellerId})`);

  // Fetch or create two test categories
  let categoriesRes = await client.query("SELECT id, name FROM categories WHERE seller_id = $1 LIMIT 2", [sellerId]);
  if (categoriesRes.rowCount < 2) {
    console.log("Creating test categories...");
    await client.query("INSERT INTO categories (seller_id, name) VALUES ($1, 'Test Cat 1'), ($1, 'Test Cat 2')", [sellerId]);
    categoriesRes = await client.query("SELECT id, name FROM categories WHERE seller_id = $1 LIMIT 2", [sellerId]);
  }

  const cat1 = categoriesRes.rows[0].id;
  const cat2 = categoriesRes.rows[1].id;
  console.log(`Using test categories: ID ${cat1} and ID ${cat2}`);

  // 2. Insert test product
  console.log("Inserting test product...");
  const productRes = await client.query(
    "INSERT INTO products (seller_id, name, price, status, category_id) VALUES ($1, 'Test Multi-Cat Product', 99.99, 'active', $2) RETURNING id",
    [sellerId, cat1]
  );
  const productId = productRes.rows[0].id;
  console.log(`Test product inserted with ID: ${productId}`);

  // 3. Map to multiple categories in join table
  console.log("Mapping product to multiple categories...");
  await client.query(
    "INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2), ($1, $3)",
    [productId, cat1, cat2]
  );

  // 4. Retrieve and verify
  const mappingsRes = await client.query(
    "SELECT category_id FROM product_categories WHERE product_id = $1",
    [productId]
  );
  const mappedIds = mappingsRes.rows.map(row => row.category_id);
  console.log(`Retrieved category mapping IDs: ${JSON.stringify(mappedIds)}`);

  const hasCat1 = mappedIds.includes(cat1);
  const hasCat2 = mappedIds.includes(cat2);

  if (hasCat1 && hasCat2) {
    console.log("✅ SUCCESS: Product successfully mapped to multiple categories!");
  } else {
    console.error("❌ FAILURE: Product category mappings do not match.");
  }

  // Cleanup
  console.log("Cleaning up test product...");
  await client.query("DELETE FROM products WHERE id = $1", [productId]);
  console.log("Test clean up complete.");

  await client.end();
}

test().catch(console.error);
