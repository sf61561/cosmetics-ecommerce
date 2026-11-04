BEGIN;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_method VARCHAR(50) NOT NULL,
    provider VARCHAR(80),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED')),
    provider_reference VARCHAR(255),
    provider_transaction_id VARCHAR(255),
    idempotency_key VARCHAR(120),
    failure_code VARCHAR(100),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_created_at
    ON payments(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
    ON payments(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_transaction
    ON payments(provider, provider_transaction_id)
    WHERE provider IS NOT NULL AND provider_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_idempotency
    ON payments(provider, idempotency_key)
    WHERE provider IS NOT NULL AND idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    provider VARCHAR(80),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
    provider_reference VARCHAR(255),
    provider_refund_id VARCHAR(255),
    idempotency_key VARCHAR(120),
    reason VARCHAR(500),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_created_at
    ON payment_refunds(payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status_created_at
    ON payment_refunds(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_provider_refund
    ON payment_refunds(provider, provider_refund_id)
    WHERE provider IS NOT NULL AND provider_refund_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_idempotency
    ON payment_refunds(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'orders'
          AND column_name = 'payment_method'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'orders'
          AND column_name = 'payment_status'
    ) THEN
        INSERT INTO payments (
            order_id,
            payment_method,
            provider,
            amount,
            currency,
            status,
            created_at,
            updated_at
        )
        SELECT
            o.id,
            COALESCE(NULLIF(o.payment_method, ''), 'COD'),
            CASE WHEN UPPER(COALESCE(o.payment_method, 'COD')) = 'COD' THEN NULL ELSE o.payment_method END,
            o.total_amount,
            'BDT',
            CASE UPPER(COALESCE(o.payment_status, 'PENDING'))
                WHEN 'PAID' THEN 'SUCCEEDED'
                WHEN 'REFUNDED' THEN 'REFUNDED'
                WHEN 'FAILED' THEN 'FAILED'
                ELSE 'PENDING'
            END,
            o.created_at,
            o.updated_at
        FROM orders o
        WHERE NOT EXISTS (
            SELECT 1 FROM payments p WHERE p.order_id = o.id
        );
    END IF;
END $$;

DROP INDEX IF EXISTS idx_orders_payment_status;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;

COMMIT;
