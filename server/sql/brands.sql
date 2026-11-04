-- =========================================
-- BRANDS TABLE MIGRATION
-- =========================================

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    logo_public_id VARCHAR(255),
    website_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_is_featured ON brands(is_featured);
CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

