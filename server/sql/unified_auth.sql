BEGIN;

-- Normalize existing addresses before enforcing case-insensitive uniqueness.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE email IS NOT NULL AND BTRIM(email) <> ''
    GROUP BY LOWER(BTRIM(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize users.email: duplicate email addresses differ only by case or whitespace.';
  END IF;
END $$;

UPDATE users
SET email = NULL
WHERE email IS NOT NULL AND BTRIM(email) = '';

UPDATE users
SET email = LOWER(BTRIM(email))
WHERE email IS NOT NULL AND email <> LOWER(BTRIM(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique
ON users (LOWER(email))
WHERE email IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_rotated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider = LOWER(provider) AND provider ~ '^[a-z0-9_-]+$'),
  provider_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_providers_provider_subject UNIQUE (provider, provider_user_id),
  CONSTRAINT uq_user_providers_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_providers_user_id
ON user_providers (user_id, created_at);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE oauth_id IS NOT NULL
      AND authprovider IS NOT NULL
      AND LOWER(authprovider) <> 'local'
    GROUP BY LOWER(authprovider), oauth_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate legacy OAuth accounts: the same provider identity is attached to multiple users.';
  END IF;
END $$;

INSERT INTO user_providers (user_id, provider, provider_user_id)
SELECT id, LOWER(authprovider), oauth_id
FROM users
WHERE oauth_id IS NOT NULL
  AND authprovider IS NOT NULL
  AND LOWER(authprovider) <> 'local'
ON CONFLICT (provider, provider_user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user_created
ON password_setup_tokens (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_expiry
ON password_setup_tokens (expires_at)
WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS oauth_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL CHECK (provider = LOWER(provider) AND provider ~ '^[a-z0-9_-]+$'),
  flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('LOGIN', 'LINK')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  state_hash CHAR(64) NOT NULL UNIQUE,
  code_verifier VARCHAR(128),
  return_to TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  CONSTRAINT chk_oauth_flow_owner CHECK (
    (flow_type = 'LOGIN' AND user_id IS NULL) OR
    (flow_type = 'LINK' AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_oauth_flows_expiry
ON oauth_flows (expires_at)
WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oauth_flows_user_created
ON oauth_flows (user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Provider link/unlink events are part of the append-only admin audit log.
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_allowed;
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_allowed CHECK (action IN (
      'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'ACCOUNT_PROVIDER_LINKED',
      'ACCOUNT_PROVIDER_UNLINKED', 'EMAIL_VERIFIED', 'ACCESS_DENIED',
      'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_PRICE_UPDATED', 'PRODUCT_STATUS_CHANGED', 'PRODUCT_DELETED',
      'INVENTORY_ADJUSTED', 'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_CHANGED',
      'CUSTOMER_PROFILE_UPDATED', 'CUSTOMER_STATUS_CHANGED',
      'COLLECTION_CREATED', 'COLLECTION_UPDATED', 'COLLECTION_DELETED',
      'BRAND_CREATED', 'BRAND_UPDATED', 'BRAND_DELETED',
      'COUPON_CREATED', 'COUPON_UPDATED', 'COUPON_STATUS_CHANGED',
      'DELIVERY_RULE_CREATED', 'DELIVERY_RULE_UPDATED',
      'HERO_SLIDER_CREATED', 'HERO_SLIDER_UPDATED', 'HERO_SLIDER_STATUS_CHANGED',
      'HERO_SLIDER_DELETED', 'HERO_SLIDER_REORDERED'
    ));
  END IF;
END $$;

COMMIT;
