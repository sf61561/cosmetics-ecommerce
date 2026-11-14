const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../config/db");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting sales returns & refund migration...");
    await client.query("BEGIN");

    // 1. Create sales_returns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(50) NOT NULL UNIQUE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
          'REQUESTED', 'INFO_NEEDED', 'APPROVED', 'REJECTED',
          'PICKUP_SCHEDULED', 'IN_TRANSIT', 'RECEIVED',
          'INSPECTED', 'REFUNDED', 'EXCHANGED', 'COMPLETED'
        )),
        reason VARCHAR(50) NOT NULL CHECK (reason IN (
          'DEFECTIVE_DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED',
          'SIZE_FIT_ISSUE', 'CHANGED_MIND', 'LATE_DELIVERY'
        )),
        customer_note TEXT,
        admin_note TEXT,
        rejection_reason TEXT,
        info_needed_prompt TEXT,
        resolution_type VARCHAR(20) DEFAULT 'REFUND' CHECK (resolution_type IN ('REFUND', 'EXCHANGE')),
        refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
        refund_method VARCHAR(20) NOT NULL CHECK (refund_method IN ('CASH', 'MFS', 'BANK')),
        refund_account_details JSONB NOT NULL DEFAULT '{}'::jsonb,
        return_shipping_fee NUMERIC(12, 2) DEFAULT 0,
        return_shipping_payer VARCHAR(20) DEFAULT 'STORE' CHECK (return_shipping_payer IN ('STORE', 'CUSTOMER')),
        is_window_overridden BOOLEAN NOT NULL DEFAULT false,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON sales_returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_sales_returns_customer_id ON sales_returns(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(status);
      CREATE INDEX IF NOT EXISTS idx_sales_returns_created_at ON sales_returns(created_at DESC);
    `);

    // 2. Create sales_return_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        variant_id UUID,
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_selling_price NUMERIC(12, 2) NOT NULL CHECK (unit_selling_price >= 0),
        unit_cost_price NUMERIC(12, 2) NULL,
        item_condition VARCHAR(30) CHECK (item_condition IN ('RESELLABLE', 'DAMAGED', 'WRONG_ITEM')),
        cost_recovered_amount NUMERIC(12, 2) DEFAULT 0,
        restocked BOOLEAN NOT NULL DEFAULT false,
        batch_id UUID NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(return_id);
      CREATE INDEX IF NOT EXISTS idx_sales_return_items_order_item_id ON sales_return_items(order_item_id);
    `);

    // 3. Create sales_return_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        return_item_id UUID REFERENCES sales_return_items(id) ON DELETE SET NULL,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        uploader_type VARCHAR(20) NOT NULL CHECK (uploader_type IN ('CUSTOMER', 'ADMIN')),
        image_url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        file_size INT,
        mime_type VARCHAR(50),
        file_hash VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_return_images_return_id ON sales_return_images(return_id);
    `);

    // 4. Create sales_return_status_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        from_status VARCHAR(30),
        to_status VARCHAR(30) NOT NULL,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        actor_role VARCHAR(20) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_return_history_return_id ON sales_return_status_history(return_id, created_at ASC);
    `);

    await client.query("COMMIT");
    console.log("Sales return tables created successfully!");
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
