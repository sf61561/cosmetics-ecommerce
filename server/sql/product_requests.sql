-- Product Requests Schema Migration
-- Tracks customer requests for unlisted products, shades, or variants

CREATE TABLE IF NOT EXISTS product_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_text VARCHAR(255),
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    source_url TEXT,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_created_at ON product_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_requests_phone ON product_requests(customer_phone);

