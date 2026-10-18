# Supabase setup — NELTRIX I.S. Global

The production Supabase project is provisioned and the quote-intake and logistics schemas have been applied. This guide describes the current integration and the remaining staff-access checks. Do not use real customer data until end-to-end testing and the business launch checks below are complete.

## 1. Current architecture

- Supabase Auth handles staff sign-in for the quote-review workspace.
- `public.profiles` assigns the quote-review role (`ops`).
- `public.quote_requests` stores public quote enquiries and is protected by row-level security.
- The public quote endpoint validates requests, hashes the trusted edge IP with `QUOTE_RATE_LIMIT_SECRET`, and calls `public.submit_quote_request` through the server's Prisma database connection.
- The database function is `SECURITY DEFINER`, uses an empty search path, and applies a five-submissions-per-15-minute limit per hashed address. Its execution privilege remains restricted; do not grant it to `anon` or `authenticated`.
- Prisma-owned shipment, calculator quote, support-ticket and audit tables are server-side only. Browser roles have no table privileges on these tables.

The web application does not require a Supabase service-role API key for quote intake. Never add a service-role or secret API key to a `NEXT_PUBLIC_*` variable.

## 2. Required environment configuration

Set production values in Vercel Project Settings → Environment Variables. Keep secrets out of source control and chat.

- `NEXT_PUBLIC_SITE_URL`: canonical production site URL.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable/legacy anon key for browser and SSR authentication; row-level security must remain enabled.
- `DATABASE_URL` or `POSTGRES_PRISMA_URL`: working server-side Prisma PostgreSQL connection.
- `DIRECT_URL` or `POSTGRES_URL_NON_POOLING`: direct PostgreSQL connection for Prisma migration tooling, if used.
- `QUOTE_RATE_LIMIT_SECRET`: random secret of at least 32 characters.

Redis credentials are optional for the current best-effort per-isolate rate-limit fallback, but a shared Redis-compatible store is recommended before public launch. AI answers require a server-only `OPENAI_API_KEY`; customer email notifications require a separately configured notification provider/webhook. Neither should be represented as active until tested.

## 3. Database migrations

The current repository migrations are:

1. `supabase/migrations/202610170001_initial_quote_intake.sql`
2. `supabase/migrations/20261018015000_add_prisma_logistics_schema.sql`
3. `supabase/migrations/20261018015100_restrict_prisma_table_api_access.sql`

They create the quote-intake tables, staff profile/role logic, rate-limit function, Prisma logistics tables, and server-only privileges. The production project already has these schemas. Before applying them to a different environment, inspect the migration history and apply each migration once in chronological order; do not blindly rerun type/table creation migrations.

## 4. Staff access

1. In Supabase Dashboard → Authentication → Users, invite the intended staff member. Public sign-up is intentionally disabled.
2. Confirm the invited email and Auth user ID are correct before assigning a role.
3. To enable quote review, ensure the matching `public.profiles` row has role `ops`. Assign only after verifying the Auth UUID:
   `update public.profiles set role = 'ops', updated_at = now() where id = '<verified-auth-user-uuid>';`
4. The shipment/support/admin workspace uses a separate trusted `app_metadata.role` check (`ADMIN` or `OPERATIONS_STAFF`). Do not assume an `ops` profile automatically grants access to that workspace.
5. Test each role with a real staff account, then verify that an ordinary account cannot access quote, shipment, support or audit data.

Never promote a user by email alone without verifying the exact Auth user ID. Never share passwords or recovery links.

## 5. Verification and launch controls

Run the repository checks before release:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

A healthy `/api/health` response verifies database connectivity and schema presence only; it does not prove quote submission, staff login, email delivery, shipment updates or support replies. Test those workflows explicitly with synthetic data and remove any test records afterward.

Before accepting real requests, complete the privacy notice and retention/deletion process, confirm Brazil–United States service coverage with carrier partners, configure monitoring and alerting, and verify abuse controls. Carrier booking, label purchase, payments and real-time carrier tracking remain separate launch milestones.
