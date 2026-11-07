require("dotenv").config({ path: __dirname + "/../.env" });
const { getClient, pool } = require("../config/db");

async function migrateReviews() {
  console.log("=== RUNNING REVIEWS MIGRATION ===");
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Add average_rating and review_count to products table if not present
    console.log("1. Adding average_rating and review_count to products...");
    await client.query(`
      ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
        ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
    `);

    // 2. Create reviews table
    console.log("2. Creating reviews table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
        variant_info JSONB,
        rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_reviews_user_product UNIQUE (user_id, product_id)
      );
    `);

    // 3. Create review_images table
    console.log("3. Creating review_images table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS review_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        image_path TEXT NOT NULL,
        public_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create performance indexes
    console.log("4. Creating indexes...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_order_item ON reviews(order_item_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);
    `);

    await client.query("COMMIT");
    console.log("✅ Reviews migration applied successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

migrateReviews().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

