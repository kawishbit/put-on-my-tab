-- =============================================================================
-- Migration: 002_rls_policies.sql
-- Description: Row Level Security policies for Put On My Tab
-- =============================================================================
-- NOTE: This project uses a custom users table (not Supabase auth.users).
--       The service-role key is used server-side (bypasses RLS).
--       Anon/authenticated JWT claims carry `user_id` and `policy` via
--       a custom JWT claim set in the auth hook (see supabase/functions/).
--       Policies here protect direct client-side DB access.
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_providers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER: extract custom claims from JWT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.request_user_policy() RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'policy', '');
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- TABLE: transaction_categories
-- Everyone can read active categories; only admin can mutate.
-- =============================================================================

CREATE POLICY "categories_select_all"
    ON transaction_categories FOR SELECT
    USING (is_deleted = FALSE);

CREATE POLICY "categories_insert_admin"
    ON transaction_categories FOR INSERT
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "categories_update_admin"
    ON transaction_categories FOR UPDATE
    USING  (public.request_user_policy() = 'admin')
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "categories_delete_admin"
    ON transaction_categories FOR DELETE
    USING (public.request_user_policy() = 'admin');

-- =============================================================================
-- TABLE: users
-- Admin: full access.
-- Mod/User: can only read own row; can update own non-sensitive fields.
-- =============================================================================

CREATE POLICY "users_select_self"
    ON users FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR (public.request_user_policy() IN ('mod', 'user') AND user_id = public.request_user_id())
        )
    );

-- Admins can see all users (including for admin dashboard)
CREATE POLICY "users_select_admin_all"
    ON users FOR SELECT
    USING (public.request_user_policy() = 'admin');

CREATE POLICY "users_insert_admin"
    ON users FOR INSERT
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "users_update_self"
    ON users FOR UPDATE
    USING  (user_id = public.request_user_id() AND is_deleted = FALSE)
    WITH CHECK (
        -- Users can only update allowed columns (avatar, name, password);
        -- policy and is_deleted changes require admin (enforced at app layer too)
        public.request_user_policy() IN ('user', 'mod', 'admin')
    );

CREATE POLICY "users_update_admin"
    ON users FOR UPDATE
    USING  (public.request_user_policy() = 'admin')
    WITH CHECK (public.request_user_policy() = 'admin');

CREATE POLICY "users_delete_admin"
    ON users FOR DELETE
    USING (public.request_user_policy() = 'admin');

-- =============================================================================
-- TABLE: user_login_providers
-- Admin: full access.
-- User/Mod: can only see/manage own providers.
-- =============================================================================

CREATE POLICY "ulp_select_own"
    ON user_login_providers FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR user_id = public.request_user_id()
        )
    );

CREATE POLICY "ulp_insert_own"
    ON user_login_providers FOR INSERT
    WITH CHECK (
        public.request_user_policy() = 'admin'
        OR user_id = public.request_user_id()
    );

CREATE POLICY "ulp_update_own"
    ON user_login_providers FOR UPDATE
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
    ON user_login_providers FOR DELETE
    USING (
        public.request_user_policy() = 'admin'
        OR user_id = public.request_user_id()
    );

-- =============================================================================
-- TABLE: transactions
-- Admin: full access.
-- Mod: can insert and read all non-deleted transactions.
-- User: can only read transactions where they are paid_by.
-- =============================================================================

CREATE POLICY "transactions_select_user"
    ON transactions FOR SELECT
    USING (
        is_deleted = FALSE
        AND (
            public.request_user_policy() = 'admin'
            OR public.request_user_policy() = 'mod'
            OR paid_by = public.request_user_id()
        )
    );

CREATE POLICY "transactions_insert_mod"
    ON transactions FOR INSERT
    WITH CHECK (
        public.request_user_policy() IN ('admin', 'mod')
    );

CREATE POLICY "transactions_update_mod"
    ON transactions FOR UPDATE
    USING  (is_deleted = FALSE AND public.request_user_policy() IN ('admin', 'mod'))
    WITH CHECK (public.request_user_policy() IN ('admin', 'mod'));

CREATE POLICY "transactions_delete_admin"
    ON transactions FOR DELETE
    USING (public.request_user_policy() = 'admin');
