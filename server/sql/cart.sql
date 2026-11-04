-- ============================================================================
-- RupKotha Cosmetics & Skincare — Shopping Cart Schema
-- Supports both authenticated customers (user_id) and guest shoppers (session_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique indexes to prevent duplicate cart rows for the same product
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_user_product ON cart_items(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_session_product ON cart_items(session_id, product_id) WHERE session_id IS NOT NULL;

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart_items(product_id);

