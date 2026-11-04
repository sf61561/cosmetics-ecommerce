-- Migration: Dedicated Wishlist System
BEGIN;

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index ensuring one product appears once per user wishlist (handling variant_id nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_user_product_variant
ON wishlist_items (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Lookup index for customer wishlist queries sorted by newest
CREATE INDEX IF NOT EXISTS idx_wishlist_user_created
ON wishlist_items (user_id, created_at DESC);

-- Index for product popularity / count lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_product
ON wishlist_items (product_id);

-- Migrate any existing WISHLIST interactions to wishlist_items
INSERT INTO wishlist_items (user_id, product_id, created_at)
SELECT DISTINCT ON (i.user_id, i.product_id) i.user_id, i.product_id, i.created_at
FROM interactions i
JOIN products p ON p.id = i.product_id
JOIN users u ON u.id = i.user_id
WHERE i.interaction_type = 'WISHLIST'
ON CONFLICT (user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

COMMIT;

