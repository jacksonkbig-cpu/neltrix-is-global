# Supabase setup — NELTRIX I.S. Global

This milestone adds a database-backed quote intake and a staff-only quote review page. **Do not use real customer data until the configuration and launch checks below have been completed.** No Supabase project is provisioned by this repository.

## 1. Create a project
1. Create a Supabase project in an account controlled by the business.
2. Choose a region appropriate for the business and privacy obligations; document the decision.
3. In Project Settings → API, copy the project URL and public/anon key. Keep the service-role key server-only.
4. In Authentication settings, disable public sign-ups. Create/invite staff users individually; do not share staff passwords.

## 2. Configure local environment
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SITE_URL`: local URL for development, production URL after deployment.
- `NEXT_PUBLIC_SUPABASE_URL`: project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role secret; server-side only, never prefix with `NEXT_PUBLIC_`.
- `QUOTE_RATE_LIMIT_SECRET`: random secret of at least 32 characters. Generate with a password manager or `openssl rand -hex 32`.

Do not commit `.env.local`, post secrets in issues, or send them in chat. Configure production values in Vercel Project Settings → Environment Variables.

## 3. Apply the database migration
Use Supabase SQL Editor or Supabase CLI to apply `supabase/migrations/202610170001_initial_quote_intake.sql`. Review it first. The migration:
- Creates profiles, quote requests, and rate-limit tables.
- Enables row-level security.
- Restricts quote reads/updates to authenticated users whose profile role is `ops`.
- Exposes quote insertion only through a server-side RPC granted to the service role.
- Applies a basic limit of five submissions per hashed client address per 15 minutes.

The rate limit is a basic safeguard, not a complete anti-abuse system. Add a managed edge/WAF rate limit and monitoring before public launch.

## 4. Assign operations access
1. Create a staff account through Supabase Auth after disabling public sign-up.
2. Confirm the user has a row in `public.profiles`.
3. In SQL Editor, promote only the intended staff UUID:
   `update public.profiles set role = 'ops', updated_at = now() where id = '<verified-auth-user-uuid>';`
4. Test `/ops/login` and `/ops` with an ops account.
5. Test a regular customer account and verify it cannot read quote requests.

Do not promote a user by email alone without verifying the exact Auth user ID.

## 5. Local checks
```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Without valid Supabase environment variables and an applied migration, the quote endpoint deliberately returns HTTP 503 and the operations area explains that setup is incomplete. Do not treat a successful build as proof of database connectivity.

## 6. Before accepting real requests
- Complete privacy notice, lawful basis/consent review, retention schedule, deletion process, and customer support process.
- Verify country, customs, restricted goods, insurance/liability, and service coverage with qualified advisers and carrier partners.
- Configure Vercel deployment protection/production variables, HTTPS, logging and alerting.
- Run end-to-end tests with synthetic data only; verify RLS and server-role key handling.
- Keep booking, carrier tracking, and payments disabled until separate milestones and launch approvals are complete.
