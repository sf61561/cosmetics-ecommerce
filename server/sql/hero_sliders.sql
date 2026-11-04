CREATE TABLE IF NOT EXISTS hero_sliders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_name VARCHAR(150) NOT NULL,
    headline VARCHAR(255) NOT NULL,
    subtitle TEXT,
    badge_text VARCHAR(100),
    button_text VARCHAR(100),
    button_link VARCHAR(500),
    desktop_image_url TEXT NOT NULL,
    desktop_image_public_id VARCHAR(255) NOT NULL,
    mobile_image_url TEXT,
    mobile_image_public_id VARCHAR(255),
    display_order INT NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    text_alignment VARCHAR(10) NOT NULL DEFAULT 'left' CHECK (text_alignment IN ('left', 'center', 'right')),
    text_color VARCHAR(10) NOT NULL DEFAULT 'light' CHECK (text_color IN ('light', 'dark')),
    overlay_opacity NUMERIC(3, 2) NOT NULL DEFAULT 0.4 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 1),
    text_position VARCHAR(10) NOT NULL DEFAULT 'center' CHECK (text_position IN ('top', 'center', 'bottom')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT hero_sliders_valid_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
    CONSTRAINT hero_sliders_button_link_valid CHECK (button_link IS NULL OR button_link ~ '^(/|https?://)')
);

CREATE INDEX IF NOT EXISTS idx_hero_sliders_publication
    ON hero_sliders(is_active, starts_at, ends_at, display_order);

CREATE INDEX IF NOT EXISTS idx_hero_sliders_order
    ON hero_sliders(display_order, created_at);

INSERT INTO hero_sliders
    (internal_name, headline, subtitle, badge_text, button_text, button_link,
     desktop_image_url, desktop_image_public_id, display_order, is_active,
     text_alignment, text_color, overlay_opacity, text_position)
SELECT 'Glass Skin Secrets', 'GLASS SKIN SECRETS', 'Get Up To 20% OFF
On Best Sellers',
       'Eloura', 'Shop Now', '/shop', '/images/slider/slider-1.png',
       'legacy-slider-1', 0, true, 'center', 'light', 0.4, 'center'
WHERE NOT EXISTS (SELECT 1 FROM hero_sliders WHERE internal_name = 'Glass Skin Secrets');

INSERT INTO hero_sliders
    (internal_name, headline, subtitle, badge_text, button_text, button_link,
     desktop_image_url, desktop_image_public_id, display_order, is_active,
     text_alignment, text_color, overlay_opacity, text_position)
SELECT 'Summer Glow Up', 'SUMMER GLOW UP', 'Flat 30% OFF
On Sunscreen Range',
       'Eloura', 'Shop Now', '/shop?category=sunscreen', '/images/slider/slider-2.png',
       'legacy-slider-2', 1, true, 'center', 'light', 0.4, 'center'
WHERE NOT EXISTS (SELECT 1 FROM hero_sliders WHERE internal_name = 'Summer Glow Up');

INSERT INTO hero_sliders
    (internal_name, headline, subtitle, badge_text, button_text, button_link,
     desktop_image_url, desktop_image_public_id, display_order, is_active,
     text_alignment, text_color, overlay_opacity, text_position)
SELECT 'New Arrivals', 'NEW ARRIVALS', 'Fresh Drops
Just Landed',
       'Eloura', 'Explore', '/new-arrivals', '/images/slider/slider-3.png',
       'legacy-slider-3', 2, true, 'center', 'light', 0.4, 'center'
WHERE NOT EXISTS (SELECT 1 FROM hero_sliders WHERE internal_name = 'New Arrivals');

INSERT INTO hero_sliders
    (internal_name, headline, subtitle, badge_text, button_text, button_link,
     desktop_image_url, desktop_image_public_id, display_order, is_active,
     text_alignment, text_color, overlay_opacity, text_position)
SELECT 'Bundle And Save', 'BUNDLE & SAVE', 'Buy 2 Get 1 Free
On All Serums',
       'Eloura', 'Shop Now', '/shop?category=serums', '/images/slider/slider-4.png',
       'legacy-slider-4', 3, true, 'center', 'light', 0.4, 'center'
WHERE NOT EXISTS (SELECT 1 FROM hero_sliders WHERE internal_name = 'Bundle And Save');
