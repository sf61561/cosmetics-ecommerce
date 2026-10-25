-- =========================================
-- 1. USER ROLE ENUM
-- =========================================

CREATE TYPE user_role AS ENUM (
    'CUSTOMER',
    'ADMIN'
);


-- =========================================
-- 2. USERS TABLE
-- =========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    email_verified_at TIMESTAMPTZ,

    password_hash TEXT NOT NULL,

    phone VARCHAR(20),

    role user_role NOT NULL DEFAULT 'CUSTOMER',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_created_at
ON users(created_at);

create index idx_users_role
on users(role);


-- =========================================
-- 3. EMAIL VERIFICATION TOKENS
-- =========================================

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_user_id
ON email_verification_tokens(user_id);

CREATE INDEX idx_email_verification_expires_at
ON email_verification_tokens(expires_at);


-- =========================================
-- 4. PASSWORD RESET TOKENS
-- =========================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_user_id
ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_expires_at
ON password_reset_tokens(expires_at);


-- =========================================
-- 5. CUSTOMER ADDRESSES
-- =========================================

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    label VARCHAR(50) NOT NULL DEFAULT 'Home',

    recipient_name VARCHAR(100) NOT NULL,

    phone VARCHAR(20) NOT NULL,

    division VARCHAR(100) NOT NULL,

    district VARCHAR(100) NOT NULL,

    area VARCHAR(150) NOT NULL,

    street_address TEXT NOT NULL,

    postal_code VARCHAR(20),

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id
ON addresses(user_id);

-- A customer can have only one default address.
CREATE UNIQUE INDEX idx_addresses_one_default_per_user
ON addresses(user_id)
WHERE is_default = TRUE

alter table users
add profile_picture_link text;