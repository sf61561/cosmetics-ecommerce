-- Migration: Search Full-Text & Trigram Indexing
BEGIN;

-- Enable PostgreSQL Trigram extension for fuzzy typo-tolerant matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text GIN index across product name, short_description, description, skin_type, and ingredients
CREATE INDEX IF NOT EXISTS idx_products_search_fts
ON products
USING GIN (
    to_tsvector('simple', 
        name || ' ' || 
        COALESCE(sku, '') || ' ' || 
        COALESCE(short_description, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(ingredients, '') || ' ' || 
        COALESCE(skin_type, '')
    )
);

-- Trigram index on product name for fuzzy matching & typo tolerance
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
ON products
USING GIN (name gin_trgm_ops);

-- Trigram index on brand name for fuzzy brand search
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm
ON brands
USING GIN (name gin_trgm_ops);

-- Trigram index on category name for fast category matching
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
ON categories
USING GIN (name gin_trgm_ops);

COMMIT;

