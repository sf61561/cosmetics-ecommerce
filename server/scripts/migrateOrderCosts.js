const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../config/db");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting order-level cost migration...");
    await client.query("BEGIN");

    // 1. Add cost columns to order_items
    await client.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NULL CHECK (cost_price IS NULL OR cost_price >= 0),
      ADD COLUMN IF NOT EXISTS cost_entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS cost_entered_at TIMESTAMPTZ NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_cost_price ON order_items(cost_price);
    `);

    // 2. Create order_other_costs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_other_costs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        header VARCHAR(100) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        note TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_other_costs_order_id ON order_other_costs(order_id);
    `);

    // 3. Create cost_headers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cost_headers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Seed standard headers
    const defaultHeaders = [
      "Delivery Charge",
      "Packaging Material",
      "Courier Fee",
      "Payment Gateway Fee",
      "Customs / Duty",
      "Gift Wrap / Ribbon",
    ];

    for (const header of defaultHeaders) {
      await client.query(`
        INSERT INTO cost_headers (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING;
      `, [header]);
    }

    await client.query("COMMIT");
    console.log("Order cost migration completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
