-- =============================================================================
-- Migration: 006_merge_users_rls_policies.sql
-- Description: Merge duplicate permissive RLS policies on users for SELECT/UPDATE
-- =============================================================================

-- Remove duplicated permissive SELECT policies and keep one combined policy.
DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_select_admin_all" ON public.users;

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

-- Remove duplicated permissive UPDATE policies and keep one combined policy.
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;

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
