-- =============================================================================
-- Migration: Product Variants System
-- Description: Adds product_options, option_values, product_variants,
--              variant_option_values, and updates cart_items with variant_id.
-- =============================================================================

-- 1. Product Options Table (e.g. 'Shade', 'Size', 'Volume')
CREATE TABLE IF NOT EXISTS product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'button' CHECK (type IN ('swatch', 'button', 'dropdown')),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_options_product_name UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_options_product_id 
ON product_options(product_id, position ASC);

-- 2. Option Values Table (e.g. 'Rose', 'Nude', '50 ml')
CREATE TABLE IF NOT EXISTS option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    swatch_hex VARCHAR(20),
    swatch_image TEXT,
    swatch_image_public_id VARCHAR(255),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_option_values_option_value UNIQUE (option_id, value)
);

CREATE INDEX IF NOT EXISTS idx_option_values_option_id 
ON option_values(option_id, position ASC);

-- 3. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    options_key VARCHAR(255) NOT NULL DEFAULT 'default',
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(12, 2) CHECK (compare_at_price IS NULL OR compare_at_price > price),
    size_value NUMERIC(10, 2),
    size_unit VARCHAR(20),
    image_url TEXT,
    image_public_id VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_combination 
ON product_variants (product_id, options_key) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_lookup 
ON product_variants (product_id, is_active, is_available);

CREATE INDEX IF NOT EXISTS idx_product_variants_price 
ON product_variants (price);

-- 4. Variant to Option Values Join Table
CREATE TABLE IF NOT EXISTS variant_option_values (
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES option_values(id) ON DELETE RESTRICT,
    PRIMARY KEY (variant_id, option_value_id)
);

CREATE INDEX IF NOT EXISTS idx_variant_option_values_option 
ON variant_option_values(option_value_id);

-- 5. Extend cart_items with variant_id
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Drop old cart unique indexes if they exist
DROP INDEX IF EXISTS idx_cart_user_product;
DROP INDEX IF EXISTS idx_cart_session_product;

-- Create new variant-aware cart unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_user_product_variant 
ON cart_items(user_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_session_product_variant 
ON cart_items(session_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
WHERE session_id IS NOT NULL AND user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_cart_variant_id ON cart_items(variant_id);

