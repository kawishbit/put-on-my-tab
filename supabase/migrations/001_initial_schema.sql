-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Consolidated initial schema for Put On My Tab
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- AUTH CLAIM HELPERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION public.request_user_policy()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'policy', '');
$$;

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_login_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    updated_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT,
    policy TEXT NOT NULL DEFAULT 'user' CHECK (policy IN ('user', 'mod', 'admin'))
);

CREATE TABLE public.transaction_categories (
    transaction_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    updated_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT
);

CREATE TABLE public.user_login_providers (
    user_login_provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('google', 'github', 'credentials')),
    provider_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    updated_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT,
    UNIQUE (provider_type, provider_key)
);

CREATE TABLE public.transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    transaction_remark TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_by UUID NOT NULL REFERENCES public.users(user_id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    group_key UUID NOT NULL,
    category UUID REFERENCES public.transaction_categories(transaction_category_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    updated_by UUID REFERENCES public.users(user_id) DEFAULT public.request_user_id(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_users_email ON public.users(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_policy ON public.users(policy) WHERE is_deleted = FALSE;

CREATE INDEX idx_ulp_user_id ON public.user_login_providers(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_ulp_provider ON public.user_login_providers(provider_type, provider_key) WHERE is_deleted = FALSE;

CREATE INDEX idx_transactions_paid_by ON public.transactions(paid_by) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_group_key ON public.transactions(group_key) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_status ON public.transactions(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_type ON public.transactions(type) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_category ON public.transactions(category) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date DESC) WHERE is_deleted = FALSE;

-- =============================================================================
-- TRIGGER FUNCTION + TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(NEW.updated_by, public.request_user_id(), OLD.updated_by);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ulp_updated_at
    BEFORE UPDATE ON public.user_login_providers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_transaction_categories_updated_at
    BEFORE UPDATE ON public.transaction_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- BALANCE + MUTATION RPCS (NON-SPLITTING)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.recompute_user_balances(
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE users
    SET current_balance = 0,
        updated_by = COALESCE(p_actor_user_id, updated_by);

    UPDATE users u
    SET current_balance = balances.balance,
        updated_by = COALESCE(p_actor_user_id, u.updated_by)
    FROM (
        SELECT
            t.paid_by AS user_id,
            SUM(
                CASE
                    WHEN t.type = 'deposit' THEN t.amount
                    ELSE -t.amount
                END
            ) AS balance
        FROM transactions t
        WHERE t.is_deleted = FALSE
          AND t.status = 'completed'
        GROUP BY t.paid_by
    ) balances
    WHERE u.user_id = balances.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_transaction_group(
    p_transaction_id UUID,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    group_key UUID,
    transaction_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_key UUID;
    v_tx_ids UUID[];
BEGIN
    SELECT t.group_key
    INTO v_group_key
    FROM transactions t
    WHERE t.transaction_id = p_transaction_id
      AND t.is_deleted = FALSE
    LIMIT 1;

    IF v_group_key IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    SELECT array_agg(t.transaction_id)
    INTO v_tx_ids
    FROM transactions t
    WHERE t.group_key = v_group_key
      AND t.is_deleted = FALSE;

    UPDATE transactions
    SET is_deleted = TRUE,
        updated_by = COALESCE(p_actor_user_id, updated_by)
    WHERE group_key = v_group_key
      AND is_deleted = FALSE;

    PERFORM public.recompute_user_balances(p_actor_user_id);

    RETURN QUERY SELECT v_group_key, COALESCE(v_tx_ids, '{}'::UUID[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_transaction_group_status(
    p_transaction_id UUID,
    p_status TEXT,
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_key UUID;
    v_current_status TEXT;
BEGIN
    IF p_status NOT IN ('pending', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transaction status: %', p_status;
    END IF;

    SELECT t.group_key
    INTO v_group_key
    FROM transactions t
    WHERE t.transaction_id = p_transaction_id
      AND t.is_deleted = FALSE
    LIMIT 1;

    IF v_group_key IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    SELECT t.status
    INTO v_current_status
    FROM transactions t
    WHERE t.group_key = v_group_key
      AND t.is_deleted = FALSE
      AND t.type = 'deposit'
    LIMIT 1;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Transaction group missing deposit record';
    END IF;

    IF v_current_status = p_status THEN
        RETURN;
    END IF;

    IF v_current_status <> 'pending' OR p_status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_status;
    END IF;

    UPDATE transactions
    SET status = p_status,
        updated_by = COALESCE(p_actor_user_id, updated_by)
    WHERE group_key = v_group_key
      AND is_deleted = FALSE;

    PERFORM public.recompute_user_balances(p_actor_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_user_balances(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_user_balances(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_transaction_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_transaction_group(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_transaction_group_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_group_status(UUID, TEXT, UUID) TO service_role;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all"
    ON public.transaction_categories FOR SELECT
    USING (is_deleted = FALSE);

CREATE POLICY "categories_insert_admin"
    ON public.transaction_categories FOR INSERT
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "categories_update_admin"
    ON public.transaction_categories FOR UPDATE
    USING  (public.request_user_policy() = 'admin')
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "categories_delete_admin"
    ON public.transaction_categories FOR DELETE
    USING (public.request_user_policy() = 'admin');

CREATE POLICY "users_select"
    ON public.users FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR (
                public.request_user_policy() IN ('mod', 'user')
                AND user_id = public.request_user_id()
            )
        )
    );

CREATE POLICY "users_insert_admin"
    ON public.users FOR INSERT
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "users_update"
    ON public.users FOR UPDATE
    USING (
        public.request_user_policy() = 'admin'
        OR (user_id = public.request_user_id() AND is_deleted = FALSE)
    )
    WITH CHECK (
        public.request_user_policy() = 'admin'
        OR public.request_user_policy() IN ('user', 'mod', 'admin')
    );

CREATE POLICY "users_delete_admin"
    ON public.users FOR DELETE
    USING (public.request_user_policy() = 'admin');

CREATE POLICY "ulp_select_own"
    ON public.user_login_providers FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR user_id = public.request_user_id()
        )
    );

CREATE POLICY "ulp_insert_own"
    ON public.user_login_providers FOR INSERT
    WITH CHECK (
        public.request_user_policy() = 'admin'
        OR user_id = public.request_user_id()
    );

CREATE POLICY "ulp_update_own"
    ON public.user_login_providers FOR UPDATE
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR user_id = public.request_user_id()
        )
    )
    WITH CHECK (
        public.request_user_policy() = 'admin'
        OR user_id = public.request_user_id()
    );

CREATE POLICY "ulp_delete_own"
    ON public.user_login_providers FOR DELETE
    USING (
        public.request_user_policy() = 'admin'
        OR user_id = public.request_user_id()
    );

CREATE POLICY "transactions_select_user"
    ON public.transactions FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR public.request_user_policy() = 'mod'
            OR paid_by = public.request_user_id()
        )
    );

CREATE POLICY "transactions_insert_mod"
    ON public.transactions FOR INSERT
    WITH CHECK (
        public.request_user_policy() IN ('admin', 'mod')
    );

CREATE POLICY "transactions_update_mod"
    ON public.transactions FOR UPDATE
    USING  (is_deleted = FALSE AND public.request_user_policy() IN ('admin', 'mod'))
    WITH CHECK (public.request_user_policy() IN ('admin', 'mod'));

CREATE POLICY "transactions_delete_admin"
    ON public.transactions FOR DELETE
    USING (public.request_user_policy() = 'admin');
