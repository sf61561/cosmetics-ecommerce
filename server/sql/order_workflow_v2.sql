-- Migration: Complete Order Workflow Design (v2)
BEGIN;

-- 1. Add order workflow columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_total NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'BDT';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_area VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS placed_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Drop and recreate check constraints to support PENDING and PLACED
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('PENDING', 'PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'));

-- 3. Backfill existing orders
UPDATE orders SET
    status = CASE 
        WHEN LOWER(COALESCE(order_status, 'pending')) IN ('placed', 'pending') THEN 'pending'
        ELSE LOWER(order_status)
    END,
    subtotal = COALESCE(subtotal, product_subtotal, total_amount - delivery_fee, 0),
    shipping_fee = COALESCE(shipping_fee, delivery_fee, 70.00),
    discount_total = COALESCE(discount_total, (COALESCE(product_discount, 0) + COALESCE(coupon_discount, 0) + COALESCE(delivery_discount, 0))),
    grand_total = COALESCE(grand_total, total_amount, 0),
    shipping_name = COALESCE(shipping_name, recipient_name),
    shipping_phone = COALESCE(shipping_phone, recipient_phone),
    shipping_address = COALESCE(shipping_address, delivery_street_address),
    shipping_city = COALESCE(shipping_city, delivery_district),
    shipping_area = COALESCE(shipping_area, delivery_area),
    placed_at = COALESCE(placed_at, created_at, NOW())
WHERE status IS NULL OR subtotal IS NULL OR grand_total IS NULL;

-- 4. Add variant_id to order_items if not present
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID;

-- 5. Add provider_payload to payments if not present
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payload JSONB;

-- 6. Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Indexes for fast status lookups and order tracking
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id, created_at ASC);

-- 8. Backfill initial status history for orders without history
INSERT INTO order_status_history (order_id, from_status, to_status, note, created_at)
SELECT o.id, NULL, o.status, 'Initial order placement', o.created_at
FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM order_status_history osh WHERE osh.order_id = o.id
);

COMMIT;
