# Production deployment checklist

## GitHub and Vercel
1. Connect `jacksonkbig-cpu/neltrix-is-global` in Vercel and set the root directory to the repository root.
2. Use Node.js 20.9+ and the repository build command `npm run build`.
3. Deploy this feature branch as a Preview first. Do not merge to `main` until lint, typecheck, tests, migration review, and preview smoke tests pass.
4. Set Preview and Production environment variables separately in Vercel Project Settings → Environment Variables. Keep `SUPABASE_SERVICE_ROLE_KEY`, `CARRIER_API_KEY`, `ENCRYPTION_KEY`, and database credentials server-only.

## Database and secrets
1. Provision managed PostgreSQL and create separate least-privilege runtime and migration credentials where supported.
2. Configure pooled `DATABASE_URL` and direct `DIRECT_URL`.
3. In a reviewed release job, run `npx prisma migrate deploy`. Do not run `prisma migrate dev` against production.
4. Rotate secrets using overlapping old/new keys where supported; re-encrypt stored ciphertext before retiring an encryption key. Keep backups and test restore procedures.
5. Do not set `ENABLE_MOCK_TRACKING=true` in Production.

## Domain and TLS
1. Add the custom domain in Vercel Project Settings → Domains.
2. Apply exactly the DNS records Vercel displays for that domain (commonly an apex A record and a www CNAME; values can vary). Avoid inventing AAAA records; only add one if the host specifies it.
3. Wait for DNS propagation and automatic certificate issuance, then verify HTTPS and redirect behavior.
4. Only enable HSTS preload after every subdomain is HTTPS-capable and the organization accepts the long-lived preload commitment.

## Launch gate
- Apply and verify migrations on staging and production.
- Test quote intake, staff auth/RLS, tracking DB lookup, provider timeout/failure, invalid payloads, and rate limits.
- Verify CSP in browser DevTools, check security headers, and run dependency/security scans.
- Confirm monitoring, backups, alerting, incident contacts, privacy notices, and carrier contract/API access.
- Do not advertise live carrier tracking or calculated rates until a real provider and pricing rules are configured and tested.
