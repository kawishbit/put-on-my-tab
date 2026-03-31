# Put On My Tab Roadmap

## Summary
- App goal: Replace spreadsheet-based per-user redundant ledger with a normalized shared transaction model.
- Key feature: grouped transaction split (one payment by payer + parties shares), recalculated current balances.
- Roles and policies from requirements: user/mod/admin with increasing privileges.

## Phase 1: Foundation (Done)
- [x] Initiate latest NextJS project (`bun create next-app@latest putonmytab`)
- [x] Add latest shadcn (`bunx --bun shadcn@latest init`)

## Phase 2: Authentication & Layout (In Progress)
**Dependencies:** Complete Phase 1

### Authentication
- [x] Add login page UI supporting username/password + Google + GitHub (fullscreen)
- [x] NextAuth.js config + providers
- [x] "Connect Google/GitHub" in user settings
- [x] Logout flow
- [x] Secure password change flow

### Layout
- [x] Add app layout with sidebar
- [x] Add sidebar menus (Dashboard, Transactions, Users, Categories, Settings)
- [x] Add user balance indicator in sidebar
- [x] Add role-aware navigation rendering (user/mod/admin)

## Phase 3: Core UI Scaffolding (Planned)
**Dependencies:** Complete Phase 2

### Dashboards
- [ ] User Dashboard UI (balance, monthly spend, last 10 tx, category donut)
- [ ] Admin Dashboard UI (global summary, per-user balances, monthly spend, last 10 tx, category donut)

### Transaction flows
 [ ] All transactions UI with pagination/search/filter
 [ ] User transactions UI (owner-filtered) and details
 [x] Create transaction UI (payer + parties + amount + category + group key semantics)
 [ ] Update transaction UI
 [ ] Delete transaction UI

### User management
 [x] All users UI (admin)
 [x] Create user flow (admin)
 [ ] Update user flow (admin)
 [x] Delete user flow (admin)
 [ ] Change own password (user)
 [ ] Reset user password (admin)

### Transaction categories
 [x] CRUD transaction category UI

### Exports + utilities
- [ ] Export transactions to CSV
- [ ] Export users to CSV
- [ ] Router checks, route correctness audit

## Phase 4: Backend & Data Layer (Planned)
**Dependencies:** Complete Phase 3

### Entities from README
- [x] User model (current balance, policy role, login providers, meta)
- [x] UserLoginProvider model (google/github linking)
- [x] Transaction model (name, remark, paidBy, amount, type, status, category, groupKey)
- [x] TransactionCategory model

- ### Supabase + authentication
- [x] Supabase setup + schema migration
- [x] NextAuth.js integration with Supabase user table
- [x] Google/GitHub provider integration
- [x] User provider link/unlink flows

### GraphQL + APIs
- [x] GraphQL schema + resolvers for all entities
- [x] Transaction logic for split group creation:
  - payer topup deposit
  - payer share withdraw
  - each party share withdraw
  - group key link
- [ ] Update/delete group transaction consistency

### Policies
- [x] Implement User policy (personal data, own tx, change password, link providers)
- [x] Implement Mod policy (+ create tx)
- [x] Implement Admin policy (+ all tx/users/categories, reset passwords)
- [x] Supabase row-level security (RLS) per role

### Balance engine
- [x] Recalculate current balance on tx add/update/delete
- [ ] Ensure negative/positive semantics align (user zero start, owed vs owing)
- [ ] Transaction statuses handling (pending/completed/cancelled)

## Phase 5: Testing & QA

### Unit tests
- [ ] Utility functions (splits, math, formatting)
- [ ] Auth flows (login, provider, session)
- [ ] Transaction split logic
- [ ] Policy checks

### Integration tests
- [ ] GraphQL endpoint CRUD tests
- [ ] Supabase queries with RLS tests
- [ ] Auth and user policy tests
- [ ] Transaction group consistency tests

### E2E tests
- [ ] Login flows (email/password, Google, GitHub)
- [ ] Create transaction as A+B+C split scenario (balance updates)
- [ ] Edit transaction and re-verify balances
- [ ] Delete transaction and verify rollback balance
- [ ] CSV export content validation

### Manual QA
- [ ] Role-based enforcement (user vs mod vs admin)
- [ ] Data correctness in dashboard summaries
- [ ] Mobile/responsiveness and UX on small screens
- [ ] Cross-browser verification (Chrome, Firefox, Safari)

## How to use this roadmap
1. Update checkboxes as tasks progress.
2. Mark blockers with **[BLOCKED]**.
3. Prefer one task per PR and update this file on completion.
