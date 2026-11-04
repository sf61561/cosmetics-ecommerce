-- ==============================================================================
-- Migration: Hero Sliders V2 Enhancement
-- Adds: alt_text, open_in_new_tab, placement columns and publication indexes
-- ==============================================================================

-- 1. Add alt_text (accessibility), open_in_new_tab, and placement columns if not existing
ALTER TABLE hero_sliders
    ADD COLUMN IF NOT EXISTS alt_text VARCHAR(255),
    ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS placement VARCHAR(50) NOT NULL DEFAULT 'home_hero';

-- 2. Populate alt_text from headline for existing rows
UPDATE hero_sliders
SET alt_text = headline
WHERE alt_text IS NULL OR alt_text = '';

-- 3. Composite publication index including placement
CREATE INDEX IF NOT EXISTS idx_hero_sliders_placement_publication
    ON hero_sliders(placement, is_active, starts_at, ends_at, display_order);

