-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial schema for Put On My Tab
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLE: transaction_categories
-- =============================================================================
CREATE TABLE transaction_categories (
    transaction_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label                   TEXT        NOT NULL UNIQUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted              BOOLEAN     NOT NULL DEFAULT FALSE,
    remarks                 TEXT
);

-- =============================================================================
-- TABLE: users
-- =============================================================================
CREATE TABLE users (
    user_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL,
    email             TEXT        NOT NULL UNIQUE,
    password          TEXT        NOT NULL,
    avatar            TEXT,
    current_balance   NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_login_date   TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
    remarks           TEXT,
    -- Policy: 'user' | 'mod' | 'admin'
    policy            TEXT        NOT NULL DEFAULT 'user' CHECK (policy IN ('user', 'mod', 'admin'))
);

-- =============================================================================
-- TABLE: user_login_providers
-- =============================================================================
CREATE TABLE user_login_providers (
    user_login_provider_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider_type          TEXT        NOT NULL CHECK (provider_type IN ('google', 'github', 'credentials')),
    provider_key           TEXT        NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted             BOOLEAN     NOT NULL DEFAULT FALSE,
    remarks                TEXT,
    UNIQUE (provider_type, provider_key)
);

-- =============================================================================
-- TABLE: transactions
-- =============================================================================
CREATE TABLE transactions (
    transaction_id      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT           NOT NULL,
    transaction_remark  TEXT,
    paid_by             UUID           NOT NULL REFERENCES users(user_id),
    amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    -- Type: 'deposit' | 'withdraw'
    type                TEXT           NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    -- Status: 'pending' | 'completed' | 'cancelled'
    status              TEXT           NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    -- GroupKey ties the 1 deposit + N withdraw records together
    group_key           UUID           NOT NULL,
    category            UUID           REFERENCES transaction_categories(transaction_category_id),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    is_deleted          BOOLEAN        NOT NULL DEFAULT FALSE,
    remarks             TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Users
CREATE INDEX idx_users_email         ON users(email)      WHERE is_deleted = FALSE;
CREATE INDEX idx_users_policy        ON users(policy)     WHERE is_deleted = FALSE;

-- User login providers
CREATE INDEX idx_ulp_user_id         ON user_login_providers(user_id)       WHERE is_deleted = FALSE;
CREATE INDEX idx_ulp_provider        ON user_login_providers(provider_type, provider_key) WHERE is_deleted = FALSE;

-- Transactions
CREATE INDEX idx_transactions_paid_by    ON transactions(paid_by)    WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_group_key  ON transactions(group_key)  WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_status     ON transactions(status)      WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_type       ON transactions(type)        WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_category   ON transactions(category)    WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC) WHERE is_deleted = FALSE;

-- =============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ulp_updated_at
    BEFORE UPDATE ON user_login_providers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transaction_categories_updated_at
    BEFORE UPDATE ON transaction_categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
