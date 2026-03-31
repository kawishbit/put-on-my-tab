-- Triggers to maintain users.current_balance and example RLS policies

-- Function helpers
CREATE OR REPLACE FUNCTION transaction_delta_row(t transactions) RETURNS numeric AS $$
BEGIN
  IF t.type = 'deposit' THEN
    RETURN t.amount;
  ELSIF t.type = 'withdraw' THEN
    RETURN -t.amount;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- AFTER INSERT: apply delta to paid_by
CREATE OR REPLACE FUNCTION transactions_after_insert() RETURNS trigger AS $$
BEGIN
  IF NEW.paid_by IS NOT NULL THEN
    UPDATE users
    SET current_balance = current_balance + (CASE WHEN NEW.type = 'deposit' THEN NEW.amount WHEN NEW.type = 'withdraw' THEN -NEW.amount ELSE 0 END)
    WHERE id = NEW.paid_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER UPDATE: remove old delta from old paid_by, add new delta to new paid_by
CREATE OR REPLACE FUNCTION transactions_after_update() RETURNS trigger AS $$
BEGIN
  IF OLD.paid_by IS NOT NULL THEN
    UPDATE users
    SET current_balance = current_balance - (CASE WHEN OLD.type = 'deposit' THEN OLD.amount WHEN OLD.type = 'withdraw' THEN -OLD.amount ELSE 0 END)
    WHERE id = OLD.paid_by;
  END IF;

  IF NEW.paid_by IS NOT NULL THEN
    UPDATE users
    SET current_balance = current_balance + (CASE WHEN NEW.type = 'deposit' THEN NEW.amount WHEN NEW.type = 'withdraw' THEN -NEW.amount ELSE 0 END)
    WHERE id = NEW.paid_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER DELETE: subtract delta
CREATE OR REPLACE FUNCTION transactions_after_delete() RETURNS trigger AS $$
BEGIN
  IF OLD.paid_by IS NOT NULL THEN
    UPDATE users
    SET current_balance = current_balance - (CASE WHEN OLD.type = 'deposit' THEN OLD.amount WHEN OLD.type = 'withdraw' THEN -OLD.amount ELSE 0 END)
    WHERE id = OLD.paid_by;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_transactions_ai ON transactions;
CREATE TRIGGER trg_transactions_ai AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION transactions_after_insert();

DROP TRIGGER IF EXISTS trg_transactions_au ON transactions;
CREATE TRIGGER trg_transactions_au AFTER UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION transactions_after_update();

DROP TRIGGER IF EXISTS trg_transactions_ad ON transactions;
CREATE TRIGGER trg_transactions_ad AFTER DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION transactions_after_delete();

-- Enable Row Level Security and example policies. REVIEW before production.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow owners to SELECT their own user row
CREATE POLICY "Users can read their own user row" ON users FOR SELECT USING (id = auth.uid()::uuid);

-- Allow admins full access to users
CREATE POLICY "Admins full access to users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid()::uuid AND u2.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid()::uuid AND u2.role = 'admin')
);

-- Transactions: allow owner (paid_by) and admins to select
CREATE POLICY "Transactions select: owner or admin" ON transactions FOR SELECT USING (
  (paid_by = auth.uid()::uuid) OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid()::uuid AND u2.role = 'admin')
);

-- Transactions insert: allow mods and admins to insert
CREATE POLICY "Transactions insert: mod or admin" ON transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid()::uuid AND u2.role IN ('mod','admin'))
);

-- Transactions update/delete: only admins
CREATE POLICY "Transactions modify: admins only" ON transactions FOR UPDATE, DELETE USING (
  EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid()::uuid AND u2.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid()::uuid AND u2.role = 'admin')
);

-- Note: These policies assume your JWT maps `auth.uid()` to the `users.id` UUID. Adjust policies to match your auth claims mapping.
