-- Migration: Remove OAuth & Third-party Provider Tables and Columns
-- Executed on database:
-- 1. Reset all users to 'local' auth provider
UPDATE users SET authprovider = 'local' WHERE authprovider != 'local' OR authprovider IS NULL;

-- 2. Drop OAuth relation tables
DROP TABLE IF EXISTS user_providers CASCADE;
DROP TABLE IF EXISTS oauth_flows CASCADE;

-- 3. Drop OAuth indexes and columns on users table
DROP INDEX IF EXISTS idx_users_oauth;
ALTER TABLE users DROP COLUMN IF EXISTS oauth_id CASCADE;
