# Put On My Tab - Project Roadmap

**Project:** Simple financial app to manage tabs between roommates, friends, and family members.

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js (App Router)
- API Strategy (MVP): Next.js Route Handlers + Supabase queries/RPC
- Query Language (Later): GraphQL (optional, post-MVP)
- Database: Supabase
- Deployment: Vercel
- Authentication: NextAuth.js
- Styling: Shadcn + Tailwind
- Bundler/Package Manager: Bun
- Linter: Biome

---

## Phase 1: Foundation & Database Setup ⚙️

### 1.1 Database Schema Design
- [x] Define Supabase tables for all entities:
  - [x] `users` (UserId, Name, Email, Password, Avatar, CurrentBalance, LastLoginDate, CreatedAt, UpdatedAt, IsDeleted, Remarks)
  - [x] `user_login_providers` (UserLoginProviderId, UserId, ProviderType, ProviderKey, CreatedAt, UpdatedAt, IsDeleted, Remarks)
  - [x] `transactions` (TransactionId, Name, TransactionRemark, PaidBy, Amount, Type, Status, GroupKey, Category, CreatedAt, UpdatedAt, IsDeleted, Remarks)
  - [x] `transaction_categories` (TransactionCategoryId, Label, CreatedAt, UpdatedAt, IsDeleted, Remarks)
- [x] Set up Supabase authentication backend
- [x] Create database relationships and constraints
- [x] Seed initial data (optional default categories)
- [x] Create RLS (Row Level Security) policies for data access

### 1.2 Project Structure & Configuration
- [x] Set up TypeScript configuration
- [x] Configure Biome linter
- [x] Set up path aliases in `tsconfig.json`
- [x] Create folder structure: `components/`, `lib/`, `hooks/`, `types/`, `contexts/`, `styles/`
- [x] Set up environment variables (`.env.local`)

### 1.3 API Layer Setup (MVP)
- [x] Define API conventions (validation, error shape, auth checks)
- [x] Create typed server-side service layer in `lib/` for business logic
- [x] Implement initial Next.js Route Handlers for core entities
- [x] Use Supabase queries/RPC for complex transactional operations
- [x] Keep transport-agnostic domain logic to allow GraphQL migration later

Implementation note (Apr 1, 2026):
- Updated Supabase server client initialization to use modern key naming (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`) only.
- Added migration `supabase/migrations/005_harden_function_search_paths.sql` to harden function `search_path` settings flagged by Supabase security advisor.
- Updated environment template to use publishable/secret key terminology only.

Implementation note (Apr 1, 2026):
- Completed Supabase-backed authentication wiring through NextAuth credentials and OAuth providers, with identity/provider linking stored in `users` and `user_login_providers`.
- Added authenticated route protection using session token policy checks in middleware and API auth helpers.

---

## Phase 2: Authentication & Authorization 🔐

### 2.1 Login/Logout System
- [x] Set up NextAuth.js configuration
- [x] Implement email/password authentication
- [x] Create login page (`/login`)
- [x] Create logout functionality
- [x] Implement session management

### 2.2 Login Providers (OAuth)
- [x] Integrate Google OAuth provider
- [x] Integrate GitHub OAuth provider
- [x] Create user account linking UI (connect Google/GitHub)
- [x] Handle existing user with new provider

### 2.3 Authorization & Policies
- [x] Implement policy system in database:
  - [x] User Policy → View own dashboard, own transactions, change own password, connect OAuth
  - [x] Mod Policy → Create transactions + User Policy permissions
  - [x] Admin Policy → All operations + Mod Policy permission
- [x] Create middleware for policy-based access control
- [x] Create authorization hooks
- [x] Protect routes based on user policies

Implementation note (Mar 31, 2026):
- Existing [supabase/migrations/002_rls_policies.sql](supabase/migrations/002_rls_policies.sql) already implements DB-level RLS policy separation for user/mod/admin.
- Added app-level policy enforcement through Next.js middleware and reusable authorization hooks to align route/API access with the same policy model.

### 2.4 Password Management
- [x] Implement password hashing on backend
- [x] Create "Change Password" page
- [x] Implement admin "Reset User Password" feature
- [x] Add security validations

Implementation note (Mar 31, 2026):
- Added centralized strong password validation (length, character mix, no spaces, bcrypt-safe max length).
- Implemented authenticated self-service password change endpoint with current-password verification and password-reuse blocking.
- Implemented admin-only user password reset endpoint with policy checks (to be used by Phase 3.1 user management UI actions).
- Added settings UI for self-service password change only.
- Password updates are hashed with bcrypt rounds and preserve credentials provider linkage for sign-in.

---

## Phase 3: Core Entity Management 🗂️

### 3.1 User Management (Admin Only)
- [x] Create "Create User" form and API
- [x] Create "View All Users" page with table
- [x] Create "Update User" form and API
- [x] Create "Delete User" functionality
- [x] Create "Update User Policy" feature
- [x] Create "Reset User Password" feature (from user table row action, no raw UUID input)

Implementation note (Apr 1, 2026):
- Added admin user management page at `/settings/admin/users` with create/view/update/delete actions and policy update controls.
- Added admin-only dynamic user endpoints (`PATCH/DELETE /api/users/[userId]` and `POST /api/users/[userId]/reset-password`) so reset-password is handled from a user row action rather than raw UUID input.
- Added soft-delete user service support and protected nested admin settings/API routes in middleware.

### 3.2 Transaction Category Management (Admin Only)
- [x] Create "Create Category" form and API
- [x] Create "View All Categories" page
- [x] Create "Update Category" form and API
- [x] Create "Delete Category" functionality
- [x] Implement category dropdown in transaction forms

Implementation note (Apr 1, 2026):
- Added admin category management page at `/settings/admin/categories` with create/view/update/delete actions.
- Added admin-only category dynamic API endpoint (`PATCH/DELETE /api/transaction-categories/[categoryId]`) and soft-delete category service support.
- Added transaction create page at `/transactions/create` with category dropdown populated from active categories.

### 3.3 User Settings Page
- [x] Create user profile/settings page (`/settings`)
- [x] Display user balance
- [x] Implement change password form
- [x] Implement Google/GitHub account connection UI
- [x] Implement account disconnection functionality

Implementation note (Apr 1, 2026):
- Completed user settings page at `/settings` with account summary and current balance display for the authenticated user.
- Added self-service password change form wired to authenticated endpoint (`POST /api/auth/change-password`) with validation and success/error feedback.
- Added connected provider management UI with connect/disconnect actions for Google and GitHub, backed by `GET/DELETE /api/auth/connected-providers` with guardrails preventing disconnection of the last login provider.

---

## Phase 4: Transaction Management 💳

### 4.1 Create Transaction Flow
- [ ] Create transaction form component with:
  - [x] Transaction name field
  - [x] Remarks field
  - [x] Amount field (positive numbers only)
  - [x] Paid By dropdown (user select)
  - [x] Parties involved multi-select (array of users)
  - [x] Category dropdown (from transaction categories)
  - [x] Type selection (Deposit/Withdraw)
- [x] Implement backend transaction creation logic:
  - [x] Validate input
  - [x] Generate GroupKey for related transactions
  - [x] Create 4 transaction records (1 deposit + N withdraws split equally)
  - [x] Calculate and update user balances
- [x] Create transaction form page (`/transactions/create`)
- [x] Implement form validation and error handling

Implementation note (Apr 1, 2026):
- Completed Phase 4.1 split-transaction creation flow end-to-end.
- Transaction create page (`/transactions/create`) is restricted to mod/admin and now supports transaction name, remark, positive amount, paid-by user selection, parties involved multi-select, and category selection.
- Backend `POST /api/transactions` validates request payload and invokes Supabase RPC `create_split_transaction` to atomically create one deposit + N withdraw transactions with a shared `group_key` and update user balances.
- Updated user listing access so mod/admin can load participants in the transaction form via `GET /api/users`.

### 4.2 View Transactions
- [x] Create "All Transactions" page with:
  - [x] Filterable/sortable transaction table
  - [x] Display: Name, Paid By, Amount, Type, Status, Date, Category
  - [x] Pagination support
- [x] Create "User Transactions" page (user-specific filtered view)

Implementation note (Apr 1, 2026):
- Added transactions listing pages at `/transactions` and `/transactions/mine` with filterable/sortable tables and pagination.
- Extended `GET /api/transactions` with typed filters (`status`, `type`, `category`, `paidBy`, `search`), sorting (`sortBy`, `sortOrder`), scope (`all`/`mine`), and pagination (`page`, `pageSize`).
- Enhanced transaction list payload with paid-by user and category labels for table display.

### 4.3 Update Transaction
- [x] Create edit transaction form page (`/transactions/[id]/edit`)
- [x] Implement update transaction API
- [x] Handle recalculation of balances when updating
- [x] Only allow admin/mod to update transactions

Implementation note (Apr 1, 2026):
- Added edit transaction page at `/transactions/[transactionId]/edit` and edit details API (`GET /api/transactions/[transactionId]`).
- Added update endpoint (`PATCH /api/transactions/[transactionId]`) restricted to mod/admin.
- Added Supabase RPC `update_split_transaction` to replace split-group records atomically and trigger balance recomputation.

### 4.4 Delete Transaction
- [x] Implement soft-delete functionality for transactions
- [x] Recalculate affected user balances
- [x] Only allow admin to delete transactions

Implementation note (Apr 1, 2026):
- Added admin-only delete endpoint (`DELETE /api/transactions/[transactionId]`) to soft-delete all records in a transaction group.
- Added Supabase RPC `soft_delete_transaction_group` and centralized balance recomputation after deletion.

### 4.5 Transaction Status Management
- [x] Implement status transitions (pending → completed, cancelled)
- [x] Create UI for status updates
- [x] Handle balance calculations based on status

Implementation note (Apr 1, 2026):
- Added status update endpoint (`PATCH /api/transactions/[transactionId]/status`) restricted to mod/admin.
- Added UI actions on the transactions table to transition `pending` groups to `completed` or `cancelled`.
- Added Supabase RPC `update_transaction_group_status` with transition guardrails and balance recomputation.

---

## Phase 5: Dashboard Pages 📊

### 5.1 Admin Dashboard (`/admin/dashboard`)
- [x] Summary section:
  - [x] Total transactions count
  - [x] Total system balance
  - [x] Active users count
- [x] Balance overview:
  - [x] List all users with current balances
  - [x] Visual indicator of credits/debits
- [x] Monthly expenditure:
  - [x] Total spending by month
  - [x] Comparison with previous months
- [x] Last 10 transactions:
  - [x] Table with recent transactions
  - [x] Quick link to details
- [x] Donut chart:
  - [x] Categorized transactions visualization
  - [x] Breakdown by TransactionCategory
- [x] More metrics (TBD):
  - [x] Top spenders
  - [x] Most frequent categories
  - [x] Pending transactions

Implementation note (Apr 1, 2026):
- Added admin-only dashboard page at `/admin/dashboard` with summary cards (total transactions, total system balance, active users) and pending transaction visibility.
- Added balance overview for active users with credit/debit visual indicators and monthly completed-spending trend with current-vs-previous month comparison.
- Added recent transactions table (last 10 deposit/group records) with direct quick links to transaction details (`/transactions/[transactionId]/edit`).
- Added category donut chart (completed spending by category) plus additional KPI blocks for top spenders and most frequent categories.
- Added reusable server-side analytics aggregation service (`lib/services/adminDashboardService.ts`) and admin dashboard navigation links.

### 5.2 User Dashboard (`/dashboard`)
- [x] User balance display (prominent)
- [x] Monthly expenditure (personal)
- [x] Last 10 user transactions
- [x] Donut chart:
  - [x] User's transactions by category
  - [x] Visual breakdown of spending
- [x] Quick action buttons:
  - [x] Create new transaction
  - [x] View all user transactions

Implementation note (Apr 1, 2026):
- Unified user and admin dashboard experiences into `/dashboard` so all users see personal dashboard data on the same page, while admin-only cards/sections are policy-protected and rendered only for `admin`.
- Updated dashboard header/labeling from "Overview" to "Dashboard" and kept the signed-in identity card in the main dashboard surface.
- Added user-focused analytics (prominent balance, personal monthly expenditure, last 10 personal transactions, and personal category donut chart) plus quick actions for creating/viewing transactions.
- Kept `/admin/dashboard` as a compatibility route that redirects to `/dashboard` after auth checks.

---

## Phase 6: Data Export Features 📥

### 6.1 Export Transactions to CSV
- [ ] Create export endpoint
- [ ] Implement CSV generation
- [ ] Add download button on transactions page
- [ ] Filter exported data based on user policy

### 6.2 Export Users to CSV
- [ ] Create export endpoint
- [ ] Implement CSV generation with user data
- [ ] Add download button on users page
- [ ] Admin-only access

---

## Phase 7: UI Components & Styling 🎨

### 7.1 Layout Components
- [x] Create main navigation/header component
- [x] Create sidebar for admin routes
- [x] Create footer component
- [x] Implement responsive design

### 7.2 Common Components (using Shadcn)
- [x] Form inputs: Text, Select, Multi-select, Date, Number
- [x] Tables with sorting and pagination
- [x] Cards for summary data
- [x] Modals for confirmations
- [x] Toast notifications for feedback
- [x] Loading spinners

### 7.3 Page Templates
- [x] Dashboard template
- [x] Form template
- [x] Table/List template
- [x] Settings template

Implementation note (Apr 1, 2026):
- Added a premium app shell with a sticky, scroll-aware header, responsive sidebar navigation, and persistent footer to improve route discoverability and app flow.
- Introduced reusable page templates (`Dashboard`, `Form`, `Table/List`, `Settings`) and design-system utility classes for cards, forms, alerts, tables, and action buttons.
- Upgraded key surfaces (home, login, settings, transactions, admin users, admin categories) to a cohesive modern finance visual language with stronger hierarchy, spacing, and interaction affordances.

---

## Phase 8: Testing & Quality Assurance ✅

### 8.1 Unit Testing
- [ ] Test transaction creation logic
- [ ] Test balance calculation logic
- [ ] Test authorization checks
- [ ] Test authentication flows

### 8.2 Integration Testing
- [ ] Test end-to-end transaction flow
- [ ] Test user creation and management
- [ ] Test policy enforcement

### 8.3 End-to-End Testing
- [ ] Test login/logout flows
- [ ] Test transaction creation, update, delete
- [ ] Test dashboard rendering
- [ ] Test data export

---

## Phase 9: Deployment & Optimization 🚀

### 9.1 Pre-Deployment Checklist
- [ ] Environment variables configured for production
- [ ] Database backups set up
- [ ] RLS policies verified
- [ ] Security review
- [ ] Performance optimization (caching, lazy loading)

### 9.2 Deployment to Vercel
- [ ] Connect repository to Vercel
- [ ] Set environment variables in Vercel
- [ ] Configure custom domain (if applicable)
- [ ] Set up CI/CD pipeline

### 9.3 Monitoring & Maintenance
- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Monitor database performance
- [ ] Regular security audits
- [ ] Backup procedures

---

## Phase 10: Multi-Database Architecture (MikroORM) 🧩

### 10.1 Data Access Abstraction
- [ ] Introduce repository interfaces for core entities (`users`, `transactions`, `transaction_categories`, `user_login_providers`)
- [ ] Move transaction business rules (split, status transitions, balance recalculation) from DB RPC-first design to service-layer orchestration
- [ ] Keep Route Handler contracts stable while swapping data providers underneath

### 10.2 MikroORM Core Setup
- [ ] Add MikroORM packages and base config
- [ ] Define shared entities and mapping strategy compatible with SQL + Mongo drivers
- [ ] Add migration workflows for SQL drivers and a separate initialization/seed strategy for MongoDB

### 10.3 Database Provider Selection via Env
- [x] Add env selector (example: `DB_PROVIDER=supabase|sqlite|mysql|mongodb`)
- [x] Implement provider factory that boots the correct MikroORM driver/config at runtime
- [x] Add per-provider env validation (`DATABASE_URL`, sqlite file path, mysql credentials, mongodb url)
- [ ] Document local dev presets for each provider

Implementation note (Apr 1, 2026):
- Added `DB_PROVIDER` selection with supported values `supabase|sqlite|mysql|mongodb` and environment validation in startup configuration.
- Added provider factory scaffolding with fail-fast behavior for providers not implemented yet.
- Kept Supabase as the default and currently implemented provider to preserve existing behavior.

### 10.4 Provider Implementations
- [ ] `supabase-postgres` provider (default): preserve current behavior and schema compatibility
- [ ] `sqlite` provider (local-first): support single-node development/testing mode
- [ ] `mysql` provider: support SQL production alternative
- [ ] `mongodb` provider: support document model alternative with explicit feature-parity caveats

### 10.5 Feature Parity and Compatibility Matrix
- [ ] Define and track parity matrix for transaction flows (create/list/update/delete/status)
- [ ] Define policy enforcement strategy outside DB-native RLS so behavior is consistent across providers
- [ ] Add fallback behavior for SQL-only features (joins, strict constraints, advanced aggregations)
- [ ] Add fallback behavior for Mongo-only differences (no relational joins, denormalization patterns)

### 10.6 Testing and Rollout
- [ ] Add provider-specific integration test suites (SQLite, MySQL, MongoDB, Supabase/Postgres)
- [ ] Add cross-provider contract tests to ensure API response parity
- [ ] Add staged rollout plan: Supabase/Postgres baseline -> SQLite local -> MySQL -> MongoDB

Implementation notes:
- MikroORM supports PostgreSQL/MySQL/SQLite/MongoDB via different drivers, but SQL and Mongo feature parity is not automatic.
- Keep Supabase/Postgres as the default baseline provider for production until parity gates are met.

---

## Implementation Priorities

### MVP (Minimum Viable Product)
**Core functionality to launch:**
1. Phase 1: Database setup + basic schema
2. Phase 2: Authentication (email/password only)
3. Phase 3.1: Basic user management
4. Phase 4.1: Create transactions with the multi-split logic
5. Phase 4.2: View all transactions
6. Phase 5.2: Basic user dashboard
7. Phase 7.1 & 7.2: Essential UI components

### Post-MVP
- OAuth providers (Google/GitHub)
- Admin dashboard with advanced metrics
- Data export features
- Additional dashboard visualizations
- Advanced transaction filtering/search
- GraphQL adoption (only if API pain points appear)
- Phase 10 multi-database architecture via MikroORM (env-selected provider)

### GraphQL Later Path (Decision Gate)
Adopt GraphQL only after MVP if at least one of these is true:
1. Multiple clients need the same backend (web + mobile + external integrations)
2. Repeated overfetching/underfetching slows feature delivery
3. Dashboard queries become hard to maintain with route handlers/RPC

If triggered, execute in this order:
- [ ] Choose GraphQL approach (Supabase GraphQL vs custom Apollo server)
- [ ] Expose existing service layer through GraphQL resolvers
- [ ] Add GraphQL client for selected dashboard/analytics screens first
- [ ] Keep REST/Route Handlers for stable flows during migration
- [ ] Migrate endpoint-by-endpoint with parity checks

---

## Dependencies & Blockers

| Task | Depends On |
|------|-----------|
| Authentication | Database schema, NextAuth config |
| Authorization | Authentication system |
| Transaction creation | Categories, User management, Authentication |
| Dashboards | Transaction management, User management |
| Data export | Transaction/User management complete |
| GraphQL adoption (optional) | MVP stability, proven query complexity, multi-client demand |
| Multi-database architecture (MikroORM) | Stable service/repository boundaries, transaction parity tests, migration strategy per provider |
| Deployment | All core features, testing complete |

---

## Notes

- **GraphQL Integration:** Defer by default. Start API-first with Route Handlers + Supabase; adopt GraphQL only after MVP if clear pain points exist.
- **Current Balance Calculation:** Should be updated atomically when transactions are created/updated/deleted
- **Soft Deletes:** All entities support soft deletes with `IsDeleted` flag
- **Group Key:** Random UUID generated server-side for transaction grouping
- **User Onboarding:** No self-registration; admin adds users and provides credentials
- **API Rate Limiting:** Implement to prevent abuse
- **Error Handling:** Comprehensive error messages for all operations
- **Multi-Database Direction:** Adopt a provider architecture with MikroORM and env-based database selection (`supabase`, `sqlite`, `mysql`, `mongodb`) while keeping API behavior consistent.

### API-First Implementation Guardrails (MVP)
- Prefer server-side aggregation for dashboard metrics (SQL views or Supabase RPC)
- Centralize business rules (split logic, balance recalculation, policy checks) in service functions
- Keep API contracts typed and stable to simplify future GraphQL layering
- Avoid exposing raw table access patterns directly to UI components

---

## Last Updated
April 1, 2026

## Status
🟡 In Progress
