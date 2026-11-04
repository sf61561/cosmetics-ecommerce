CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM'
        CHECK (actor_type IN ('ADMIN', 'CUSTOMER', 'SYSTEM', 'ANONYMOUS')),
    action VARCHAR(60) NOT NULL CHECK (action ~ '^[A-Z][A-Z0-9_]*$'),
    entity_type VARCHAR(40) NOT NULL,
    entity_id TEXT NULL,
    previous_values JSONB NULL,
    new_values JSONB NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET NULL,
    user_agent TEXT NULL,
    request_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_allowed;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_allowed CHECK (action IN (
    'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'ACCOUNT_PROVIDER_LINKED', 'ACCOUNT_PROVIDER_UNLINKED', 'EMAIL_VERIFIED', 'ACCESS_DENIED',
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
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_allowed;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_type_allowed CHECK (entity_type IN (
    'USER', 'PRODUCT', 'INVENTORY', 'ORDER', 'COLLECTION', 'BRAND',
    'COUPON', 'DELIVERY_RULE', 'HERO_SLIDER', 'SYSTEM'
));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
    ON audit_logs (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
    ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created
    ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id
    ON audit_logs (request_id) WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION reject_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_audit_log_mutation();
DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER audit_logs_no_truncate
BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_log_mutation();

DO $$
BEGIN
    IF to_regclass('public.order_change_history') IS NOT NULL THEN
        EXECUTE $migrate$
            INSERT INTO audit_logs (
                id, actor_id, actor_type, action, entity_type, entity_id,
                previous_values, new_values, metadata, created_at
            )
            SELECT h.id,
                   h.actor_user_id,
                   CASE h.actor_role
                       WHEN 'ADMIN' THEN 'ADMIN'
                       WHEN 'CUSTOMER' THEN 'CUSTOMER'
                       WHEN 'SYSTEM' THEN 'SYSTEM'
                       ELSE 'SYSTEM'
                   END,
                   CASE h.event_type
                       WHEN 'STATUS_CHANGED' THEN 'ORDER_STATUS_CHANGED'
                       WHEN 'ORDER_CREATED' THEN 'ORDER_CREATED'
                       ELSE 'ORDER_UPDATED'
                   END,
                   'ORDER',
                   h.order_id::text,
                   COALESCE((
                       SELECT jsonb_object_agg(changed.key, changed.value -> 'old')
                       FROM jsonb_each(h.changed_fields) AS changed(key, value)
                       WHERE changed.key !~* '(password|token|secret|cookie|authorization|credential|card|cvv|email|phone|address|recipient|name)'
                   ), '{}'::jsonb),
                   COALESCE((
                       SELECT jsonb_object_agg(changed.key, changed.value -> 'new')
                       FROM jsonb_each(h.changed_fields) AS changed(key, value)
                       WHERE changed.key !~* '(password|token|secret|cookie|authorization|credential|card|cvv|email|phone|address|recipient|name)'
                   ), '{}'::jsonb),
                   jsonb_build_object('migratedFrom', 'order_change_history'),
                   h.created_at
            FROM order_change_history h
            ON CONFLICT (id) DO NOTHING
        $migrate$;
        EXECUTE 'DROP TRIGGER IF EXISTS order_change_history_audit ON orders';
        EXECUTE 'DROP FUNCTION IF EXISTS record_order_change_history()';
        EXECUTE 'DROP TABLE order_change_history';
    END IF;
END;
$$;
