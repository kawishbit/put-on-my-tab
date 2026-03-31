-- =============================================================================
-- Migration: 003_seed_data.sql
-- Description: Seed default transaction categories
-- =============================================================================

INSERT INTO transaction_categories (label) VALUES
    ('Food & Dining'),
    ('Groceries'),
    ('Utilities'),
    ('Rent'),
    ('Transport'),
    ('Entertainment'),
    ('Health & Medical'),
    ('Shopping'),
    ('Travel'),
    ('Subscriptions'),
    ('Education'),
    ('Miscellaneous')
ON CONFLICT (label) DO NOTHING;
