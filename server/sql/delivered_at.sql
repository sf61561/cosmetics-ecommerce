ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Existing delivered orders use their last status-update time as the best available delivery timestamp.
UPDATE orders
SET delivered_at = COALESCE(updated_at, created_at)
WHERE order_status = 'DELIVERED'
  AND delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
ON orders(delivered_at DESC)
WHERE order_status = 'DELIVERED';
