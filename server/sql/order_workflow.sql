ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_division VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_district VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_area VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_street_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_postal_code VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency_key
ON orders(user_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;
