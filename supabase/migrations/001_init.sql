-- Supabase / Postgres schema for PutOnMyTab
-- Run with: psql -f 001_init.sql or use Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('deposit','withdraw');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('pending','completed','cancelled');
  END IF;
END $$;

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users
CREATE TABLE IF NOT EXISTS "users" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text UNIQUE NOT NULL,
  password_hash text,
  avatar_url text,
  current_balance numeric DEFAULT 0,
  role text DEFAULT 'user',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  remarks text
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- User login providers
CREATE TABLE IF NOT EXISTS user_login_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider_type text NOT NULL,
  provider_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  remarks text,
  UNIQUE(user_id, provider_type, provider_key)
);

CREATE TRIGGER user_login_providers_set_updated_at
BEFORE UPDATE ON user_login_providers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Transaction categories
CREATE TABLE IF NOT EXISTS transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  remarks text
);

CREATE TRIGGER transaction_categories_set_updated_at
BEFORE UPDATE ON transaction_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  transaction_remark text,
  paid_by uuid REFERENCES users(id),
  amount numeric NOT NULL CHECK (amount >= 0),
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'completed',
  group_key text,
  category_id uuid REFERENCES transaction_categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  remarks text
);

CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX IF NOT EXISTS idx_transactions_group_key ON transactions(group_key);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Simple view: aggregated user balance (derived from transactions)
-- NOTE: this view assumes transactions.type semantics: 'deposit' adds to payer, 'withdraw' subtracts from user
CREATE OR REPLACE VIEW user_transaction_balance AS
SELECT
  u.id as user_id,
  COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.paid_by = u.id THEN t.amount
                    WHEN t.type = 'withdraw' AND t.paid_by = u.id THEN -t.amount
                    ELSE 0 END), 0) AS balance_from_paid_by
FROM users u
LEFT JOIN transactions t ON (t.paid_by = u.id)
GROUP BY u.id;

-- Row Level Security placeholders (to be expanded with policies)
-- Enable RLS on tables and add example policy comments
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow admins full access" ON transactions USING (exists (select 1 from users where users.id = current_setting('jwt.claims.user_id')::uuid and users.role = 'admin')) WITH CHECK (exists (select 1 from users where users.id = current_setting('jwt.claims.user_id')::uuid and users.role = 'admin'));

-- End of migration
