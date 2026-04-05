-- 1. Insert/Update Users
INSERT INTO users (name, email, password, policy, is_deleted)
VALUES 
    ('Bayu', 'bayudwiyansatria@gmail.com', extensions.crypt('Password_1234567890', extensions.gen_salt('bf')), 'mod', FALSE),
    ('Yota', 'yotaaro@gmail.com', extensions.crypt('Password_1234567890', extensions.gen_salt('bf')), 'mod', FALSE),
    ('Reyn', 'me@reynhartono.com', extensions.crypt('Password_1234567890', extensions.gen_salt('bf')), 'mod', FALSE),
    ('Azhar', '4zhar0ke@gmail.com', extensions.crypt('Password_1234567890', extensions.gen_salt('bf')), 'mod', FALSE),
    ('Dilshad', 'dilshadpirates@gmail.com', extensions.crypt('Password_1234567890', extensions.gen_salt('bf')), 'user', FALSE),
    ('Yahya', 'yahya.alfatih01@gmail.com', extensions.crypt('Password_1234567890', extensions.gen_salt('bf')), 'user', FALSE)
ON CONFLICT (email) DO UPDATE
SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    policy = EXCLUDED.policy,
    is_deleted = FALSE,
    updated_at = NOW();

-- 2. Link Login Providers
INSERT INTO user_login_providers (user_id, provider_type, provider_key, is_deleted)
SELECT user_id, 'credentials', user_id::text, FALSE
FROM users
WHERE email IN (
    'bayudwiyansatria@gmail.com', 
    'yotaaro@gmail.com', 
    'me@reynhartono.com', 
    '4zhar0ke@gmail.com', 
    'dilshadpirates@gmail.com', 
    'yahya.alfatih01@gmail.com'
)
ON CONFLICT (provider_type, provider_key) DO UPDATE
SET
    user_id = EXCLUDED.user_id,
    is_deleted = FALSE,
    updated_at = NOW();