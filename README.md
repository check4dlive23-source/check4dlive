# Check4D Live

Malaysian 4D lottery **data terminal** — analytics-focused, not a gambling site.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL)
- Recharts, Framer Motion (installed for later steps)

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Create a [Supabase](https://supabase.com) project and run `supabase/schema.sql` in the SQL Editor.

3. Fill in `.env.local` with your Supabase URL and keys.

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) — homepage uses **mock data** (Steps 1–3 complete).

## Build progress

| Step | Status |
|------|--------|
| 1. Project setup | Done |
| 2. Types, Supabase clients, LogoBadge | Done |
| 3. Homepage + mock data | Done |
| 4. API routes | Pending |
| 5–10 | Pending |

## Project structure

See spec in repo — key paths: `src/components/live/`, `src/lib/mock-data.ts`, `supabase/schema.sql`.
