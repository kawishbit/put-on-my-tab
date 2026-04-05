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
        updated_by = COALESCE(p_actor_user_id, updated_by)
    WHERE user_id IS NOT NULL;

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
