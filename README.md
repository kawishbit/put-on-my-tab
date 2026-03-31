# Put On My Tab

Simple financial app to manage the tabs of people in your life (e.g roommates, friends, family members). You sort of become the bank for the people around you. They can deposit and withdraw from you. 

# Previous Implementation: Google Spreadsheet
I have multiple tables in a spreadsheet (one table per roommate). Each table has 4 columns (Date, Trx Description, Trx Amount, Current Balance).  For example, If i pay for something that cost $9 for me, user A and user B, i will add a new record to user A table and user B table with Trx Amount = 9 / 3. Another example, If user A pay $9 for something that involves me, user A and user B. I will add a top up record to user A record with the amount $9 and then i add another record to user A table and user B table with amount = 9 / 3.

This implementation is inefficient, one problem for example is you will have duplicate transactions in each table if it involves everyone. The goal is to move this implementation into a web app that we're building. Here are some scenarios that can happen and we will look at it from the perspective of old implementation and new implementation.

# New Implementation: NextJS + Typescript + API + Supabase + GraphQL + Vercel + NextAuth.JS

## Tech Stack

Language: Typescript
Framework: NextJS 
Query Language: GraphQL 
Database: Supabase 
Server/Deployment: Vercel
Authentication: NextAuth.js using normal creds or google or github

## Features 

- Admin Dashboard 
  - Summary of transactions
  - balance of each user
  - monthly expenditure
  - last 10 transactions
  - more to be added
  - Donut chart showing the all transactions categorized into transactiontype
- User Dashboard 
  - User balance 
  - monthly expenditure 
  - last 10 transactions 
  - more to be added
  - Donut chart showing the user transactions categorized into transactiontype
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
- System Configuration page 
- CRUD Transaction type 
- Login (admin and user should have the same login page)
- Set system currency 
- Set configurations

##  User Type
There is only 1 user type, everything is managed by policies.

## Policies 
- User policy => it will allow you to:
  - Check balance 
  - View User Dashboard
  - View transactions belonging to you
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
  - View all users
  - Edit system config 
  - CRUD transaction type 
  - View Admin Dashboard
  - Anything in Mod Policy 
  - Anything in User Policy


## Entities 

### Transaction 
TransactionID 
Note 
PaidBy 
Amount => supports negative value for something like debt, withdrawal, etc
Parties => other users involved in the transaction. 


### User 
UserId
Name








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
