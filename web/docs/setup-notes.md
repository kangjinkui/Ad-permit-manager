# Setup Notes

## Current state

- Docker dev environment is running
- Next.js app lives in `web/`
- Supabase client/server helpers are scaffolded
- Login, dashboard, permits, and new-record routes exist as initial shells
- Supabase SQL draft exists at `web/supabase/schema.sql`

## What is still needed

1. Create a Supabase project
2. Copy project URL and anon key into `web/.env.local`
3. Run the SQL in `web/supabase/schema.sql`
4. Replace mock dashboard/list data with Supabase queries
5. Implement the actual magic-link login server action
6. Implement Excel import preview and save flow

## Env file

Create `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Suggested next implementation order

1. Add Supabase middleware and authenticated layout
2. Implement `/login` form submit with `@gangnam.go.kr` domain validation
3. Add server queries for dashboard KPIs and permit list
4. Add create/update server actions for permit records
5. Add Excel parsing and preview screen for initial import
