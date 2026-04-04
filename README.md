# Put On My Tab

Put On My Tab is a shared-expense ledger app for households, friends, and small groups. It replaces spreadsheet-based tracking with a role-based web app where transactions are split, balances are recalculated automatically, and admins can manage users and categories from one place.

## Why This Project Exists

The original workflow used one spreadsheet per person, which caused duplicated entries for group purchases and made balance tracking error-prone. This app centralizes records into a single source of truth while keeping per-user balances and permissions clear.

## Core Features

- Role-based access with `user`, `mod`, and `admin` policies
- Credentials login plus optional Google/GitHub account linking
- Transaction lifecycle support: create, update, status change, soft delete
- Split-transaction workflow with grouped records and automatic balance recalculation
- Dashboard views for both personal and admin-level insights
- Category management for organizing expenses
- CSV export for transactions and users
- Account settings for password updates and provider management

## Policy Model

- `user`: view personal dashboard/transactions, change password, manage connected providers
- `mod`: all `user` capabilities plus create/update transaction operations
- `admin`: full access including user/category management, deletion, exports, and admin dashboard analytics

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Supabase (current provider)
- NextAuth.js
- Tailwind CSS + shadcn/ui
- Biome (format + lint)
- Bun (package manager and runtime for local scripts)

## Current Implementation Status

- Production-ready features currently run on `DB_PROVIDER=supabase`
- Provider abstraction exists for `sqlite`, `mysql`, and `mongodb`, but those providers are scaffolded and not implemented yet
- If a non-implemented provider is selected, startup fails fast with a clear error

## How Transactions Are Split

When one person pays for a group expense, the backend creates grouped records:

- 1 deposit record for the payer (full amount)
- N withdraw records for each participant share

This keeps the ledger auditable while preserving net balances. Example: a $30 ride with 3 people creates one $30 deposit (payer) and three $10 withdraw entries tied by a shared `group_key`.

## Project Structure

```txt
app/          Next.js routes, pages, and API handlers
components/   UI and feature components
lib/          Business logic, auth, API utilities, data providers
supabase/     Migrations, local config, and seed data
types/        Shared TypeScript types
```

## Prerequisites and Installation

You need the following tools before running the project locally.

### 1) Node.js (required by parts of the toolchain)

- Version: 20+
- Download from the official Node.js website, or install with your preferred version manager (for example, nvm or fnm).

### 2) Bun

- Required version: 1.0+

Install on macOS/Linux:

```bash
curl -fsSL https://bun.com/install | bash
```

Verify installation:

```bash
bun --version
```

Optional upgrade command:

```bash
bun upgrade
```

### 3) Supabase CLI

- Needed for local Supabase workflow (init/start/link/migrations)

Install on macOS with Homebrew:

```bash
brew install supabase/tap/supabase
```

Verify installation:

```bash
supabase --version
```

Initialize and start local Supabase services (from project root):

```bash
supabase init
supabase start
```

Link to a hosted Supabase project (optional, if you use a remote project):

```bash
supabase login
supabase link --project-ref <project-id>
```

You can find your `<project-id>` in your Supabase dashboard URL.

## Local Development

1. Install dependencies:

```bash
bun install
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Update `.env.local` with real credentials.

4. Start the dev server:

```bash
bun run dev
```

5. Open `http://localhost:3000`.

## Environment Variables

Use `.env.example` as the source of truth.

Required for current setup (`supabase` provider):

- `DB_PROVIDER=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `NEXTAUTH_SECRET`

Commonly needed in local/prod environments:

- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CURRENCY_SYMBOL`

Optional OAuth (enable social login/linking):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Provider-specific variables for non-default providers:

- `SQLITE_DB_PATH` when `DB_PROVIDER=sqlite`
- `MYSQL_DATABASE_URL` when `DB_PROVIDER=mysql`
- `MONGODB_URL` when `DB_PROVIDER=mongodb`

## Scripts

- `bun run dev`: start local development server
- `bun run build`: build production bundle
- `bun run start`: start production server
- `bun run format`: format code with Biome
- `bun run lint`: lint/check code with Biome
- `bun run verify:policies`: run policy verification script

## Database and Seed Data

Database migrations and seed scripts are under `supabase/`:

- `supabase/migrations/`
- `supabase/seed.sql`

Apply migrations/seeds using your Supabase workflow (local CLI or hosted project SQL editor).

## Security Notes

- No public self-registration flow; users are created by admins
- Route and API authorization is policy-enforced
- Sensitive operations (password change/reset, user/category admin actions) are server-side protected

## Roadmap

Planned phases, parity goals, and testing tasks are documented in [ROADMAP.md](ROADMAP.md).

## Contributing

1. Create a feature branch.
2. Keep changes focused and scoped.
3. Before linting, run formatting first:

```bash
bun run format
bun run lint
```

4. Open a pull request with a clear summary and test notes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
