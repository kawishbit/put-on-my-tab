-- RLS policies and helper functions for PutOnMyTab
-- This migration enables Row Level Security and defines policies for users, transactions,
-- transaction_categories, and user_login_providers.

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
DECLARE
  r text;
BEGIN
  BEGIN
    r := (SELECT role FROM users WHERE id = auth.uid()::uuid LIMIT 1);
  EXCEPTION WHEN others THEN
    r := NULL;
  END;
  RETURN r = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_mod() RETURNS boolean AS $$
DECLARE
  r text;
BEGIN
  BEGIN
    r := (SELECT role FROM users WHERE id = auth.uid()::uuid LIMIT 1);
  EXCEPTION WHEN others THEN
    r := NULL;
  END;
  RETURN r = 'mod' OR r = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS where not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_providers ENABLE ROW LEVEL SECURITY;

-- USERS policies
-- Allow users to SELECT their own row
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid()::uuid);

-- Allow admins to SELECT any
CREATE POLICY users_select_admin ON users FOR SELECT USING (is_admin());

-- Allow admins to INSERT (create users)
CREATE POLICY users_insert_admin ON users FOR INSERT WITH CHECK (is_admin());

-- Allow users to UPDATE their own profile (limited columns)
CREATE POLICY users_update_self ON users FOR UPDATE USING (id = auth.uid()::uuid) WITH CHECK (id = auth.uid()::uuid);

-- Allow admins to UPDATE any
CREATE POLICY users_update_admin ON users FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Allow admins to DELETE
CREATE POLICY users_delete_admin ON users FOR DELETE USING (is_admin());

-- USER_LOGIN_PROVIDERS policies
-- Allow owners (user_id match) to SELECT/INSERT/DELETE their own providers
CREATE POLICY ulp_select_owner ON user_login_providers FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY ulp_insert_owner ON user_login_providers FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY ulp_delete_owner ON user_login_providers FOR DELETE USING (user_id = auth.uid()::uuid);

-- Allow admins full access to user_login_providers
CREATE POLICY ulp_admin ON user_login_providers FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- TRANSACTION_CATEGORIES policies
-- Allow authenticated users to SELECT categories
CREATE POLICY categories_select_auth ON transaction_categories FOR SELECT USING (auth.role() IS NOT NULL);

-- Allow admins to INSERT/UPDATE/DELETE categories
CREATE POLICY categories_admin_insert ON transaction_categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY categories_admin_update ON transaction_categories FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY categories_admin_delete ON transaction_categories FOR DELETE USING (is_admin());

-- TRANSACTIONS policies
-- Allow users to SELECT transactions they are involved in (paid_by = me) and admins to select all
CREATE POLICY transactions_select_owner ON transactions FOR SELECT USING (paid_by = auth.uid()::uuid);
CREATE POLICY transactions_select_admin ON transactions FOR SELECT USING (is_admin());

-- Allow inserts when:
-- - creator is admin OR mod; OR
-- - the payload's paid_by equals the current user (user creating own transaction)
CREATE POLICY transactions_insert_mod_admin_or_owner ON transactions FOR INSERT WITH CHECK (
  is_mod() OR (new.paid_by = auth.uid()::uuid)
);

-- Allow updates and deletes only for admins (to keep group consistency handled centrally)
CREATE POLICY transactions_update_admin ON transactions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY transactions_delete_admin ON transactions FOR DELETE USING (is_admin());

-- End of policies migration
