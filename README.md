# EarnHub

EarnHub is a local services and gig marketplace, starting in Fountain Hill, Pennsylvania. People and employers can post paid work; workers can browse opportunities and apply.

## Included in this MVP

- Expo / React Native iOS and Android app
- Email sign-up and sign-in with persistent mobile sessions
- Browse open job listings
- Post a paid job or service request
- Apply to a job
- Supabase Postgres schema and row-level security for profiles, jobs, applications, and an append-only rewards ledger

## Stack

- Expo + React Native + TypeScript
- Supabase Auth + Postgres
- Stripe Connect planned for marketplace payments and payouts

## Setup

1. Create a Supabase project at https://supabase.com.
2. In Supabase, open **SQL Editor**, create a query, paste the contents of `supabase/migrations/001_initial_schema.sql`, and run it.
3. In Supabase, open **Project Settings → API**. Copy the Project URL and the anon/public key.
4. Create a local `.env` file based on `.env.example` and fill in:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
   ```
5. Install Node.js LTS on a computer, then run `npm install`.
6. Start the app with `npx expo start`.
7. Install Expo Go on your iPhone or Android device and scan the QR code.

For an iPhone-only workflow, you can edit this private repository in GitHub from Safari, but running the Expo development server is easiest from a computer or a cloud development environment.

## Business model

The planned EarnHub platform fee is 10% of each completed paid job. This code does not yet process money or collect commission. Stripe Connect, server-side payment handling, webhook verification, refund/dispute handling, and worker payout onboarding must be implemented and tested before real payments are accepted.

## Before public launch

- Add job acceptance, completion confirmation, and employer application management.
- Add messaging, profile editing, ratings, notifications, and report/block tools.
- Add server-side Stripe Connect payments and commission accounting. Never put secret keys in the mobile app.
- Review worker classification, tax, insurance, privacy, consumer-protection, and local/state requirements.
- Test row-level security with separate employer and worker accounts.
