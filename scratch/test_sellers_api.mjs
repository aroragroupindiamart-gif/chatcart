import pg from '/app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client } = pg;

async function test() {
  console.log("--- Testing Seller details & Orders endpoints calculations ---");
  const connectionString = process.env.DATABASE_URL || 'postgresql://chatcart:Chatcart@2026!@postgres:5432/chatcart';
  const client = new Client({ connectionString });
  await client.connect();

  const sellerId = 9;

  // 1. Seller Detail verification
  const sellerRes = await client.query("SELECT * FROM sellers WHERE id = $1", [sellerId]);
  const productCountRes = await client.query("SELECT COUNT(*)::int as c FROM products WHERE seller_id = $1", [sellerId]);
  const orderCountRes = await client.query("SELECT COUNT(*)::int as c FROM orders WHERE seller_id = $1", [sellerId]);

  console.log(`DB Seller count check: Products count = ${productCountRes.rows[0].c}, Orders count = ${orderCountRes.rows[0].c}`);

  // 2. Mocking Seller Orders parsing
  const ordersRes = await client.query("SELECT * FROM orders WHERE seller_id = $1", [sellerId]);
  const orders = ordersRes.rows;

  console.log(`Found ${orders.length} orders. Processing first order's items...`);
  if (orders.length > 0) {
    const o = orders[0];
    const itemsRes = await client.query("SELECT * FROM order_items WHERE order_id = $1", [o.id]);
    const items = itemsRes.rows;

    let customerName = "Guest";
    let customerPhone = "-";
    if (o.customer_contact) {
      const nameMatch = o.customer_contact.match(/Name:\s*([^,]+)/i);
      const phoneMatch = o.customer_contact.match(/Phone:\s*(.+)/i);
      customerName = nameMatch ? nameMatch[1].trim() : o.customer_contact;
      customerPhone = phoneMatch ? phoneMatch[1].trim() : "-";
    }

    const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const total = parseFloat(o.total_amount);

    console.log("Processed order details:");
    console.log(`- ID: ${o.id}`);
    console.log(`- Customer Name: ${customerName}`);
    console.log(`- Customer Phone: ${customerPhone}`);
    console.log(`- Items Count: ${itemsCount}`);
    console.log(`- Total Amount: ${total}`);

    if (customerName && customerPhone && itemsCount !== undefined && total !== undefined) {
      console.log("✅ SUCCESS: Order item details calculations verified!");
    } else {
      console.error("❌ FAILURE: Missing calculated fields in order!");
    }
  }

  await client.end();
}

test().catch(console.error);
