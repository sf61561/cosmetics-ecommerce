-- ========================================================
-- ELOURA COSMETICS & SKINCARE — INTERACTIONS DDL
-- ========================================================

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('VIEW', 'ADD_TO_CART', 'WISHLIST', 'PURCHASE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Targeted B-Tree Indexes for Recommendation Queries & History Lookups
CREATE INDEX IF NOT EXISTS idx_interactions_user_created 
    ON interactions(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_session_created 
    ON interactions(session_id, created_at DESC) 
    WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_product_id 
    ON interactions(product_id);

CREATE INDEX IF NOT EXISTS idx_interactions_type 
    ON interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_interactions_created_at 
    ON interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_user_prod_type 
    ON interactions(user_id, product_id, interaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_sess_prod_type 
    ON interactions(session_id, product_id, interaction_type, created_at DESC);

