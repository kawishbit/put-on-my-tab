-- =============================================================================
-- Migration: 008_add_created_by_updated_by_audit_columns.sql
-- Description: Add created_by/updated_by audit columns and propagate actor IDs
-- =============================================================================

-- =============================================================================
-- AUDIT COLUMNS
-- =============================================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);

ALTER TABLE user_login_providers
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);

ALTER TABLE transaction_categories
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(user_id);

ALTER TABLE users
    ALTER COLUMN created_by SET DEFAULT public.request_user_id(),
    ALTER COLUMN updated_by SET DEFAULT public.request_user_id();

ALTER TABLE user_login_providers
    ALTER COLUMN created_by SET DEFAULT public.request_user_id(),
    ALTER COLUMN updated_by SET DEFAULT public.request_user_id();

ALTER TABLE transactions
    ALTER COLUMN created_by SET DEFAULT public.request_user_id(),
    ALTER COLUMN updated_by SET DEFAULT public.request_user_id();

ALTER TABLE transaction_categories
    ALTER COLUMN created_by SET DEFAULT public.request_user_id(),
    ALTER COLUMN updated_by SET DEFAULT public.request_user_id();

-- Keep the existing trigger wiring and enrich it to also set updated_by.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(NEW.updated_by, public.request_user_id(), OLD.updated_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RPCs
-- =============================================================================

DROP FUNCTION IF EXISTS public.recompute_user_balances();
DROP FUNCTION IF EXISTS public.recompute_user_balances(UUID);
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

DROP FUNCTION IF EXISTS public.create_split_transaction(TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_split_transaction(TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.create_split_transaction(
    p_name TEXT,
    p_transaction_remark TEXT,
    p_paid_by UUID,
    p_amount NUMERIC(12, 2),
    p_parties UUID[],
    p_category UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'completed',
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
    v_group_key UUID := gen_random_uuid();
    v_parties UUID[];
    v_party_count INTEGER;
    v_base_share NUMERIC(12, 2);
    v_share NUMERIC(12, 2);
    v_allocated NUMERIC(12, 2) := 0;
    v_tx_ids UUID[] := '{}';
    v_tx_id UUID;
    v_party UUID;
    v_index INTEGER := 1;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'Transaction name is required';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Transaction amount must be greater than zero';
    END IF;

    IF p_status NOT IN ('pending', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transaction status: %', p_status;
    END IF;

    v_parties := ARRAY(
        SELECT DISTINCT p
        FROM unnest(array_append(COALESCE(p_parties, '{}'::UUID[]), p_paid_by)) AS p
    );

    v_party_count := COALESCE(array_length(v_parties, 1), 0);

    IF v_party_count = 0 THEN
        RAISE EXCEPTION 'At least one party must be included';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM users u
        WHERE u.user_id = ANY(v_parties)
          AND u.is_deleted = FALSE
    ) <> v_party_count THEN
        RAISE EXCEPTION 'One or more parties are invalid or deleted users';
    END IF;

    v_base_share := round(p_amount / v_party_count::NUMERIC, 2);

    INSERT INTO transactions (
        name,
        transaction_remark,
        paid_by,
        amount,
        type,
        status,
        group_key,
        category,
        is_deleted,
        remarks,
        created_by,
        updated_by
    ) VALUES (
        p_name,
        p_transaction_remark,
        p_paid_by,
        p_amount,
        'deposit',
        p_status,
        v_group_key,
        p_category,
        FALSE,
        NULL,
        p_actor_user_id,
        p_actor_user_id
    )
    RETURNING transaction_id INTO v_tx_id;

    v_tx_ids := array_append(v_tx_ids, v_tx_id);

    UPDATE users
    SET current_balance = current_balance + p_amount,
        updated_by = COALESCE(p_actor_user_id, updated_by)
    WHERE user_id = p_paid_by;

    FOREACH v_party IN ARRAY v_parties LOOP
        IF v_index < v_party_count THEN
            v_share := v_base_share;
        ELSE
            v_share := round(p_amount - v_allocated, 2);
        END IF;

        INSERT INTO transactions (
            name,
            transaction_remark,
            paid_by,
            amount,
            type,
            status,
            group_key,
            category,
            is_deleted,
            remarks,
            created_by,
            updated_by
        ) VALUES (
            p_name,
            p_transaction_remark,
            v_party,
            v_share,
            'withdraw',
            p_status,
            v_group_key,
            p_category,
            FALSE,
            NULL,
            p_actor_user_id,
            p_actor_user_id
        )
        RETURNING transaction_id INTO v_tx_id;

        v_tx_ids := array_append(v_tx_ids, v_tx_id);
        v_allocated := v_allocated + v_share;

        UPDATE users
        SET current_balance = current_balance - v_share,
            updated_by = COALESCE(p_actor_user_id, updated_by)
        WHERE user_id = v_party;

        v_index := v_index + 1;
    END LOOP;

    RETURN QUERY SELECT v_group_key, v_tx_ids;
END;
$$;

DROP FUNCTION IF EXISTS public.update_split_transaction(UUID, TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_split_transaction(UUID, TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.update_split_transaction(
    p_transaction_id UUID,
    p_name TEXT,
    p_transaction_remark TEXT,
    p_paid_by UUID,
    p_amount NUMERIC(12, 2),
    p_parties UUID[],
    p_category UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'pending',
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
    v_parties UUID[];
    v_party_count INTEGER;
    v_base_share NUMERIC(12, 2);
    v_share NUMERIC(12, 2);
    v_allocated NUMERIC(12, 2) := 0;
    v_tx_ids UUID[] := '{}';
    v_tx_id UUID;
    v_party UUID;
    v_index INTEGER := 1;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'Transaction name is required';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Transaction amount must be greater than zero';
    END IF;

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

    v_parties := ARRAY(
        SELECT DISTINCT p
        FROM unnest(array_append(COALESCE(p_parties, '{}'::UUID[]), p_paid_by)) AS p
    );

    v_party_count := COALESCE(array_length(v_parties, 1), 0);

    IF v_party_count = 0 THEN
        RAISE EXCEPTION 'At least one party must be included';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM users u
        WHERE u.user_id = ANY(v_parties)
          AND u.is_deleted = FALSE
    ) <> v_party_count THEN
        RAISE EXCEPTION 'One or more parties are invalid or deleted users';
    END IF;

    UPDATE transactions
    SET is_deleted = TRUE,
        updated_by = COALESCE(p_actor_user_id, updated_by)
    WHERE group_key = v_group_key
      AND is_deleted = FALSE;

    v_base_share := round(p_amount / v_party_count::NUMERIC, 2);

    INSERT INTO transactions (
        name,
        transaction_remark,
        paid_by,
        amount,
        type,
        status,
        group_key,
        category,
        is_deleted,
        remarks,
        created_by,
        updated_by
    ) VALUES (
        p_name,
        p_transaction_remark,
        p_paid_by,
        p_amount,
        'deposit',
        p_status,
        v_group_key,
        p_category,
        FALSE,
        NULL,
        p_actor_user_id,
        p_actor_user_id
    )
    RETURNING transaction_id INTO v_tx_id;

    v_tx_ids := array_append(v_tx_ids, v_tx_id);

    FOREACH v_party IN ARRAY v_parties LOOP
        IF v_index < v_party_count THEN
            v_share := v_base_share;
        ELSE
            v_share := round(p_amount - v_allocated, 2);
        END IF;

        INSERT INTO transactions (
            name,
            transaction_remark,
            paid_by,
            amount,
            type,
            status,
            group_key,
            category,
            is_deleted,
            remarks,
            created_by,
            updated_by
        ) VALUES (
            p_name,
            p_transaction_remark,
            v_party,
            v_share,
            'withdraw',
            p_status,
            v_group_key,
            p_category,
            FALSE,
            NULL,
            p_actor_user_id,
            p_actor_user_id
        )
        RETURNING transaction_id INTO v_tx_id;

        v_tx_ids := array_append(v_tx_ids, v_tx_id);
        v_allocated := v_allocated + v_share;
        v_index := v_index + 1;
    END LOOP;

    PERFORM public.recompute_user_balances(p_actor_user_id);

    RETURN QUERY SELECT v_group_key, v_tx_ids;
END;
$$;

DROP FUNCTION IF EXISTS public.soft_delete_transaction_group(UUID);
DROP FUNCTION IF EXISTS public.soft_delete_transaction_group(UUID, UUID);
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

DROP FUNCTION IF EXISTS public.update_transaction_group_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_transaction_group_status(UUID, TEXT, UUID);
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

GRANT EXECUTE ON FUNCTION public.create_split_transaction(TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_split_transaction(TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_split_transaction(UUID, TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_split_transaction(UUID, TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.soft_delete_transaction_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_transaction_group(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_transaction_group_status(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_group_status(UUID, TEXT, UUID) TO service_role;
