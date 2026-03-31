/*
  Simple verification script for Supabase policies and triggers.

  Usage:
    SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/verify_policies.js

  What it does:
  - Ensures an admin user with the provided email exists (creates if missing)
  - Creates a sample category
  - Creates a deposit transaction by the admin and checks that `users.current_balance` updates

  Note: This script uses the Service Role Key; run only in a secure environment.
*/

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

// Safety check: require explicit opt-in to run this potentially-destructive verification script
const VERIFY_FLAG = process.env.VERIFY_POLICIES || process.env.VERIFY_POLICY_RUN
if (!VERIFY_FLAG || !/^1|true|yes$/i.test(VERIFY_FLAG)) {
  console.error('Safety: verification aborted. Set VERIFY_POLICIES=1 (or VERIFY_POLICIES=true) to run this script.')
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function supabaseFetch(path, opts = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1${path}`
  const res = await fetch(url, { headers, ...opts })
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch (e) { body = text }
  return { status: res.status, body }
}

async function ensureAdmin(email = 'admin@example.com') {
  const q = `?email=eq.${encodeURIComponent(email)}&select=*`
  const get = await supabaseFetch(`/users${q}`, { method: 'GET' })
  if (Array.isArray(get.body) && get.body.length > 0) {
    console.log('Admin user exists:', get.body[0].id)
    return get.body[0]
  }

  const payload = { email, name: 'Administrator', role: 'admin', current_balance: 0 }
  const create = await supabaseFetch('/users', { method: 'POST', body: JSON.stringify(payload), headers })
  if (create.status >= 400) {
    console.error('Failed to create admin user', create.status, create.body)
    process.exit(1)
  }
  console.log('Created admin user:', create.body[0].id)
  return create.body[0]
}

async function createCategory(label = 'Sample') {
  const create = await supabaseFetch('/transaction_categories', { method: 'POST', body: JSON.stringify({ label }), headers })
  if (create.status >= 400) {
    console.error('Failed to create category', create.status, create.body)
    return null
  }
  console.log('Created category:', create.body[0].id)
  return create.body[0]
}

async function createDeposit(paid_by, amount = 100) {
  const payload = { name: 'Seed deposit', transaction_remark: 'Verify trigger', paid_by, amount, type: 'deposit', status: 'completed' }
  const create = await supabaseFetch('/transactions', { method: 'POST', body: JSON.stringify(payload), headers })
  if (create.status >= 400) {
    console.error('Failed to create transaction', create.status, create.body)
    return null
  }
  console.log('Inserted transaction(s) count:', Array.isArray(create.body) ? create.body.length : 1)
  return create.body
}

async function getUser(userId) {
  const res = await supabaseFetch(`/users?id=eq.${userId}&select=*`, { method: 'GET' })
  if (res.status >= 400) return null
  return res.body[0]
}

(async function main(){
  try {
    const admin = await ensureAdmin(process.env.SEED_ADMIN_EMAIL || 'admin@example.com')
    const category = await createCategory('Seed Category')
    console.log('Creating deposit for admin to test balance trigger...')
    await createDeposit(admin.id, 123.45)
    // Wait briefly for DB triggers
    await new Promise(r => setTimeout(r, 1000))
    const updated = await getUser(admin.id)
    console.log('Admin current_balance after deposit:', updated?.current_balance)
    console.log('Verification complete. If balance increased by deposit amount, triggers are working.')
  } catch (e) {
    console.error('Error in verify script:', e)
    process.exit(1)
  }
})()
