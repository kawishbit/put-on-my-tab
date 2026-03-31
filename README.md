# Put On My Tab

Simple financial app to manage the tabs of people in your life (e.g roommates, friends, family members). You sort of become the bank for the people around you. They can deposit and withdraw from you. 

# Previous Implementation: Google Spreadsheet
I have multiple tables in a spreadsheet (one table per roommate). Each table has 4 columns (Date, Trx Description, Trx Amount, Current Balance).  For example, If i pay for something that cost $9 for me, user A and user B, i will add a new record to user A table and user B table with Trx Amount = 9 / 3. Another example, If user A pay $9 for something that involves me, user A and user B. I will add a top up record to user A record with the amount $9 and then i add another record to user A table and user B table with amount = 9 / 3.

This implementation is inefficient, one problem for example is you will have duplicate transactions in each table if it involves everyone. The goal is to move this implementation into a web app that we're building. Here are some scenarios that can happen and we will look at it from the perspective of old implementation and new implementation.

# New Implementation

## Tech Stack

Language: Typescript
Framework: NextJS 
Query Language: GraphQL 
Database: Supabase 
Server/Deployment: Vercel
Linter: Biome 
Authentication: NextAuth.js using normal creds or google or github
Styling: Shadcn + Tailwind
Bundler: Bun 
Package Manager: Bun 

## Features 

- Admin Dashboard 
  - Summary of transactions
  - balance of each user
  - monthly expenditure
  - last 10 transactions
  - more to be added
  - Donut chart showing the all transactions categorized into transactionCategory
- User Dashboard 
  - User balance 
  - monthly expenditure 
  - last 10 transactions 
  - more to be added
  - Donut chart showing the user transactions categorized into transactionCategory
- All transactions
- Create transaction
- Update transaction
- Delete transaction
- User transactions 
- Create user
- Update user
- Update user policy
- Delete user
- View all users
- CRUD Transaction Category 
- Login (admin and user should have the same login page)
- Export transactions into csv 
- Export users into csv 
- Change password
- Connect account to Google (for login) 
- Connect account to Github (for login)

## Policies 
- User policy => it will allow you to:
  - View User Dashboard
  - View transactions belonging to you
  - Change own password
  - Connect account to Google (for login) 
  - Connect account to Github (for login)
- Mod Policy => it will allow you to:
  - Create transaction
  - Anything in User Policy
- Admin policy => it will allow you to:
  - View all transactions
  - Update transaction
  - Delete transaction
  - Create user
  - Update user
  - Update user policy
  - Delete user
  - Reset User's password
  - View all users
  - CRUD transaction category 
  - View Admin Dashboard
  - Anything in Mod Policy 
  - Anything in User Policy


## Entities 

### User 
UserId
Name
Email 
Password 
Avatar
CurrentBalance => calculcated every time a transaction involving this user is added or updated or deleted
LastLoginDate
CreatedAt
UpdatedAt
IsDeleted
Remarks


### UserLoginProvider
UserLoginProviderId
UserId
ProviderType (google, github)
ProviderKey => ID Token from providers
CreatedAt
UpdatedAt
IsDeleted
Remarks


### Transaction 
TransactionId 
Name 
TransactionRemark
PaidBy 
Amount => positive number only 
Type => Deposit or Withdraw
Status => pending, completed, cancelled 
GroupKey => To indicate that multiple transactions are related to each other, empty means not related to any other transactions
Category
CreatedAt
UpdatedAt
IsDeleted
Remarks

### TransactionCategory
TransactionCategoryId 
Label 
CreatedAt
UpdatedAt
IsDeleted
Remarks


## Transaction Flow

- There are User A, B and C.
- Assume that each one has 0 balance.
- User A, B and C ride an uber from home to work. 
- User-A pays the bill that costs $30. 
- User-A adds a new transaction to the system. 
- The form will ask for a transaction name, remarks, amount, paid by and parties involved (an array of other users).
- User-A fills in the form, sets in User-A as Paid By, adds User-B and User-C as parties.
- UI will send this data to the backend.
- Create transaction logic will process the data.
- It will be separated into 4 transaction records with the same group key: 
  - Transaction 1 = User-A tops up $30 into the system (amount=30,type=deposit,status=completed,category=transport,group-key=sample-random-group-key) 
  - Transaction 2 = User-A pays $10 (amount=10,type=withdraw,status=completed,category=transport,group-key=sample-random-group-key) 
  - Transaction 3 = User-B pays $10 (amount=10,type=withdraw,status=completed,category=transport,group-key=sample-random-group-key) 
  - Transaction 4 = User-C pays $10 (amount=10,type=withdraw,status=completed,category=transport,group-key=sample-random-group-key) 
- After this transaction, User-A's balance is 20, User-B's balance is -10, User-C's balance is -10

## Login Flow

- User-A cannot register since there's no registration feature 
- User-A asks User-X (admin) to add him
- User-X with admin policy privilege adds User-A and set his password
- User-X tells User-A the password in real life
- User-A logs in with the email and password
- User-A accesses the system
- User-A goes to user setting page
- User-A connects his personal Google and Github to the system
- User-A logs out
- User-A logs in using Google
- User-A can login.

# To Do For Agent

For a detailed roadmap with phases, dependencies, and testing tasks, see [ROADMAP.md](ROADMAP.md).

**Current Focus:** Phase 2 - Authentication & Layout

Quick status:
- ✅ Phase 1: Foundation complete
- 🔄 Phase 2: Authentication & Layout (in progress)
- ⏳ Phase 3: Feature UI Scaffolding (planned)
- ⏳ Phase 4: Backend & Data Layer (planned)

# NextJS Documentation

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
