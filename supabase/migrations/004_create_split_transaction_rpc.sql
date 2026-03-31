-- =============================================================================
-- Migration: 004_create_split_transaction_rpc.sql
-- Description: RPC for atomic split transaction creation + balance updates
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_split_transaction(
    p_name TEXT,
    p_transaction_remark TEXT,
    p_paid_by UUID,
    p_amount NUMERIC(12, 2),
    p_parties UUID[],
    p_category UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'completed'
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

    -- Ensure paid_by is always included in the split set and remove duplicates.
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
        remarks
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
        NULL
    )
    RETURNING transaction_id INTO v_tx_id;

    v_tx_ids := array_append(v_tx_ids, v_tx_id);

    UPDATE users
    SET current_balance = current_balance + p_amount
    WHERE user_id = p_paid_by;

    FOREACH v_party IN ARRAY v_parties LOOP
        IF v_index < v_party_count THEN
            v_share := v_base_share;
        ELSE
            -- Keep a stable 2-decimal total by assigning remainder to last row.
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
            remarks
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
            NULL
        )
        RETURNING transaction_id INTO v_tx_id;

        v_tx_ids := array_append(v_tx_ids, v_tx_id);
        v_allocated := v_allocated + v_share;

        UPDATE users
        SET current_balance = current_balance - v_share
        WHERE user_id = v_party;

        v_index := v_index + 1;
    END LOOP;

    RETURN QUERY SELECT v_group_key, v_tx_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_split_transaction(TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_split_transaction(TEXT, TEXT, UUID, NUMERIC, UUID[], UUID, TEXT) TO service_role;
