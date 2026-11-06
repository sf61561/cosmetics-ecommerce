-- Tags and Product Tags Schema Migration
-- Enables administrative tag management and product association

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_tags (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id);

