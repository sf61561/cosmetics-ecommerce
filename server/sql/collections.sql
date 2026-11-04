-- =========================================
-- COLLECTIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    image_public_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_is_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

-- =========================================
-- PRODUCT_COLLECTIONS JOIN TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS product_collections (
    product_id UUID NOT NULL,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_product_collections_collection ON product_collections(collection_id);

