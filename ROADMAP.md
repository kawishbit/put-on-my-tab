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
- [ ] Create "Create Category" form and API
- [ ] Create "View All Categories" page
- [ ] Create "Update Category" form and API
- [ ] Create "Delete Category" functionality
- [ ] Implement category dropdown in transaction forms

### 3.3 User Settings Page
- [ ] Create user profile/settings page (`/settings`)
- [ ] Display user balance
- [ ] Implement change password form
- [ ] Implement Google/GitHub account connection UI
- [ ] Implement account disconnection functionality

---

## Phase 4: Transaction Management 💳

### 4.1 Create Transaction Flow
- [ ] Create transaction form component with:
  - [ ] Transaction name field
  - [ ] Remarks field
  - [ ] Amount field (positive numbers only)
  - [ ] Paid By dropdown (user select)
  - [ ] Parties involved multi-select (array of users)
  - [ ] Category dropdown (from transaction categories)
  - [ ] Type selection (Deposit/Withdraw)
- [ ] Implement backend transaction creation logic:
  - [ ] Validate input
  - [ ] Generate GroupKey for related transactions
  - [ ] Create 4 transaction records (1 deposit + N withdraws split equally)
  - [ ] Calculate and update user balances
- [ ] Create transaction form page (`/transactions/create`)
- [ ] Implement form validation and error handling

### 4.2 View Transactions
- [ ] Create "All Transactions" page with:
  - [ ] Filterable/sortable transaction table
  - [ ] Display: Name, Paid By, Amount, Type, Status, Date, Category
  - [ ] Pagination support
- [ ] Create "User Transactions" page (user-specific filtered view)

### 4.3 Update Transaction
- [ ] Create edit transaction form page (`/transactions/[id]/edit`)
- [ ] Implement update transaction API
- [ ] Handle recalculation of balances when updating
- [ ] Only allow admin/mod to update transactions

### 4.4 Delete Transaction
- [ ] Implement soft-delete functionality for transactions
- [ ] Recalculate affected user balances
- [ ] Only allow admin to delete transactions

### 4.5 Transaction Status Management
- [ ] Implement status transitions (pending → completed, cancelled)
- [ ] Create UI for status updates
- [ ] Handle balance calculations based on status

---

## Phase 5: Dashboard Pages 📊

### 5.1 Admin Dashboard (`/admin/dashboard`)
- [ ] Summary section:
  - [ ] Total transactions count
  - [ ] Total system balance
  - [ ] Active users count
- [ ] Balance overview:
  - [ ] List all users with current balances
  - [ ] Visual indicator of credits/debits
- [ ] Monthly expenditure:
  - [ ] Total spending by month
  - [ ] Comparison with previous months
- [ ] Last 10 transactions:
  - [ ] Table with recent transactions
  - [ ] Quick link to details
- [ ] Donut chart:
  - [ ] Categorized transactions visualization
  - [ ] Breakdown by TransactionCategory
- [ ] More metrics (TBD):
  - [ ] Top spenders
  - [ ] Most frequent categories
  - [ ] Pending transactions

### 5.2 User Dashboard (`/dashboard`)
- [ ] User balance display (prominent)
- [ ] Monthly expenditure (personal)
- [ ] Last 10 user transactions
- [ ] Donut chart:
  - [ ] User's transactions by category
  - [ ] Visual breakdown of spending
- [ ] Quick action buttons:
  - [ ] Create new transaction
  - [ ] View all user transactions

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
- [ ] Create main navigation/header component
- [ ] Create sidebar for admin routes
- [ ] Create footer component
- [ ] Implement responsive design

### 7.2 Common Components (using Shadcn)
- [ ] Form inputs: Text, Select, Multi-select, Date, Number
- [ ] Tables with sorting and pagination
- [ ] Cards for summary data
- [ ] Modals for confirmations
- [ ] Toast notifications for feedback
- [ ] Loading spinners

### 7.3 Page Templates
- [ ] Dashboard template
- [ ] Form template
- [ ] Table/List template
- [ ] Settings template

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

### API-First Implementation Guardrails (MVP)
- Prefer server-side aggregation for dashboard metrics (SQL views or Supabase RPC)
- Centralize business rules (split logic, balance recalculation, policy checks) in service functions
- Keep API contracts typed and stable to simplify future GraphQL layering
- Avoid exposing raw table access patterns directly to UI components

---

## Last Updated
March 31, 2026

## Status
🟡 In Progress
