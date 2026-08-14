import pg from '/app/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client } = pg;

async function query() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://chatcart:Chatcart@2026!@postgres:5432/chatcart';
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query("SELECT * FROM categories WHERE dozen_discount_percent IS NOT NULL OR bulk_discount_min_qty IS NOT NULL");
  console.log("Discounted Categories:", res.rows);
  await client.end();
}
query().catch(console.error);
