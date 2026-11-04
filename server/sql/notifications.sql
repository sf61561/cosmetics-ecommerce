-- ==============================================================================
-- Migration: Eloura Centralized Notification System
-- Tables: notifications, notification_deliveries, notification_preferences, push_subscriptions
-- ==============================================================================

-- 1. In-App Notifications Feed (Customer & Admin)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,    -- NULL for admin broadcasts or system-wide events
    target_role VARCHAR(20) DEFAULT 'CUSTOMER',             -- 'CUSTOMER', 'ADMIN', 'ALL'
    type VARCHAR(64) NOT NULL,                              -- 'order.placed', 'order.shipped', 'admin.order_placed', etc.
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,                         -- { orderId, orderNumber, link, icon, actionText }
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, read_at) 
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_feed 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_admin_feed 
ON notifications(target_role, created_at DESC) 
WHERE target_role = 'ADMIN';

-- 2. Asynchronous Deliveries Outbox Queue
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,                           -- 'in_app', 'email', 'sms', 'push'
    recipient VARCHAR(255) NOT NULL,                        -- email address or phone number
    status VARCHAR(20) DEFAULT 'queued',                    -- 'queued', 'processing', 'sent', 'failed'
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,           -- `${type}:${referenceId}:${channel}`
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 4,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    provider_message_id VARCHAR(255),
    error TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending 
ON notification_deliveries(status, next_retry_at) 
WHERE status IN ('queued', 'processing');

-- 3. Notification Preferences (Customer Opt-Ins)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,                          -- 'order_updates', 'promotions', 'wishlist_alerts', 'security_alerts'
    channel VARCHAR(20) NOT NULL,                           -- 'email', 'sms', 'push'
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, category, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_lookup 
ON notification_preferences(user_id, category, channel);

-- 4. Push Subscriptions (Web / Mobile Future-Proofing)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,                                    -- { p256dh, auth }
    platform VARCHAR(32) DEFAULT 'web',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
