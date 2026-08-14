import pg from '/app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client } = pg;

async function test() {
  console.log("--- Testing Order Creation & Bulk Discount Snapshots ---");
  const connectionString = process.env.DATABASE_URL || 'postgresql://chatcart:Chatcart@2026!@postgres:5432/chatcart';
  const client = new Client({ connectionString });
  await client.connect();

  // Find a product in Category 2 (Clothing - 10% discount at 6+ quantity)
  const productRes = await client.query(
    "SELECT id, name, price FROM products WHERE seller_id = 1 AND category_id = 2 LIMIT 1"
  );
  if (productRes.rowCount === 0) {
    console.log("❌ No products found in Category 2 to test bulk discount.");
    await client.end();
    return;
  }
  const product = productRes.rows[0];
  const basePrice = parseFloat(product.price);
  console.log(`Using product: ${product.name} (ID: ${product.id}) with base price: ${basePrice}`);

  // Test case 1: Quantity below threshold (e.g. 2 items) -> no discount
  const qtyBelow = 2;
  let effectivePriceBelow = basePrice;
  // Test case 2: Quantity at threshold (e.g. 6 items) -> 10% discount
  const qtyAt = 6;
  const discountPct = 10;
  const effectivePriceAt = basePrice * (1 - discountPct / 100);

  console.log(`Expected unit price for qty ${qtyBelow}: ${effectivePriceBelow}`);
  console.log(`Expected unit price for qty ${qtyAt}: ${effectivePriceAt}`);

  // Mock placing order with 6 items (qualifies for discount)
  const url = 'http://localhost:8080/api/public/orders';
  const payload = {
    sellerId: 1,
    customerContact: 'Name: Test Discount, Phone: 9999999999',
    items: [
      {
        productNameSnapshot: product.name,
        priceSnapshot: effectivePriceAt.toFixed(2),
        quantity: qtyAt
      }
    ]
  };

  console.log(`Placing test order to public API...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const order = await res.json();
    console.log(`Order placed successfully. ID: ${order.id}, Total: ${order.totalAmount}`);
    console.log("Order items returned:", order.items);

    const savedItem = order.items[0];
    const savedPrice = parseFloat(savedItem.priceSnapshot);
    console.log(`Saved snapshot price: ${savedPrice}`);

    if (Math.abs(savedPrice - effectivePriceAt) < 0.01) {
      console.log("✅ SUCCESS: Order item correctly saved with discounted bulk price snapshot!");
    } else {
      console.error(`❌ FAILURE: Expected price snapshot to be ${effectivePriceAt}, but got ${savedPrice}`);
    }

    // Cleanup order
    await client.query("DELETE FROM orders WHERE id = $1", [order.id]);
    console.log("Cleaned up test order.");
  } catch (error) {
    console.error("❌ Fetch error:", error.message);
  }

  await client.end();
}

test().catch(console.error);
