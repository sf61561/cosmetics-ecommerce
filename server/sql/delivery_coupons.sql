-- RupKotha delivery rules and coupon management

CREATE TABLE IF NOT EXISTS delivery_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    zone VARCHAR(30) NOT NULL CHECK (zone IN ('INSIDE_DHAKA', 'OUTSIDE_DHAKA')),
    delivery_charge NUMERIC(12, 2) NOT NULL CHECK (delivery_charge >= 0),
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    free_delivery_threshold NUMERIC(12, 2) CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold >= 0),
    estimated_delivery_time VARCHAR(100),
    priority INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_rules_zone_active
    ON delivery_rules(zone, is_active, priority DESC);

INSERT INTO delivery_rules
    (name, zone, delivery_charge, min_order_amount, free_delivery_threshold,
     estimated_delivery_time, priority, is_active)
SELECT 'Inside Dhaka Standard', 'INSIDE_DHAKA', 70, 0, NULL,
       '2-3 business days', 0, true
WHERE NOT EXISTS (
    SELECT 1 FROM delivery_rules WHERE zone = 'INSIDE_DHAKA'
);

INSERT INTO delivery_rules
    (name, zone, delivery_charge, min_order_amount, free_delivery_threshold,
     estimated_delivery_time, priority, is_active)
SELECT 'Outside Dhaka Standard', 'OUTSIDE_DHAKA', 130, 0, NULL,
       '3-5 business days', 0, true
WHERE NOT EXISTS (
    SELECT 1 FROM delivery_rules WHERE zone = 'OUTSIDE_DHAKA'
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(30) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY')),
    discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
    max_discount_amount NUMERIC(12, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    usage_limit INT CHECK (usage_limit IS NULL OR usage_limit >= 0),
    per_customer_limit INT CHECK (per_customer_limit IS NULL OR per_customer_limit >= 0),
    usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT coupons_dates_valid CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at),
    CONSTRAINT coupons_percentage_valid CHECK (
        discount_type <> 'PERCENTAGE' OR (discount_value > 0 AND discount_value <= 100)
    ),
    CONSTRAINT coupons_free_delivery_valid CHECK (
        discount_type <> 'FREE_DELIVERY' OR discount_value = 0
    )
);

CREATE INDEX IF NOT EXISTS idx_coupons_active_dates
    ON coupons(is_active, starts_at, expires_at);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_redemptions_order
    ON coupon_redemptions(coupon_id, order_id)
    WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer
    ON coupon_redemptions(coupon_id, user_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_subtotal NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_discount NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    product_discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (product_discount >= 0),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
