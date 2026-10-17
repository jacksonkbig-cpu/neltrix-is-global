# NELTRIX I.S. Global — website starter

A Next.js foundation for NELTRIX I.S. Global. The quote intake and staff quote-review workflow require a separately configured Supabase project and applied migration. It is **not yet a live shipping platform**: carrier tracking, rate calculations, booking, crypto payments, and production deployment remain unimplemented.

## Requirements
- Node.js 20.9+ (recommended)
- npm

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## Production build check
```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Current status
Implemented:
- Responsive landing page and services overview
- Accessible mobile navigation menu
- Baseline security headers and a simple application health endpoint
- Tracking-number form with explicit “integration not connected” result
- Server-side quote request validation and a Supabase RPC persistence path (requires environment setup)
- Supabase-authenticated staff sign-in and an operations-only quote review page
- Database migration with row-level security and basic request rate limiting
- Unit tests for quote request validation
- Domain/production setup documentation

Not implemented / not live:
- No public account registration; staff authentication requires configured Supabase Auth and manually assigned ops roles
- No real-time shipment tracking or carrier connection
- No shipment creation, rates, labels, pickup dispatch, driver app, or operations console
- No crypto payments or wallet monitoring
- No production Supabase project configured in this repository; quote intake returns unavailable until setup is complete
- No email/SMS notifications or customer self-service accounts
- No production deployment or domain registration

## Supabase quote-intake setup
Follow [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md) to configure a Supabase project, apply the migration, set server-only environment variables, and assign staff access. Do not submit real customer data until the checklist is complete.

## Recommended next milestones
1. Confirm company legal name, launch locations, domain, and legal operating model.
2. Select hosting (e.g. Vercel or a cloud platform), database (managed PostgreSQL), and authentication provider.
3. Create carrier accounts and obtain production API access for the selected countries/services.
4. Select a crypto payment processor after legal/compliance review; use provider-hosted checkout and signed webhooks. Never collect wallet seed phrases or private keys in this app.
5. Implement shipment, quote, tracking-event, payment, webhook, user, and audit data models.
6. Add integration tests, security review, backups, monitoring, and pilot acceptance tests.
7. Deploy only after verified carrier coverage, pricing, payment reconciliation, and operational procedures are ready.

## Domain checklist
Potential naming candidates to check (availability is unknown):
- neltrixglobal.com
- neltrixisglobal.com
- neltrixshipping.com
- shipneltrix.com

Check registrar availability, trademarks, corporate registries, and matching social handles before buying or printing branding. These suggestions are not confirmed available.

## Security notes
- Do not put provider API keys in `NEXT_PUBLIC_*` variables.
- Verify payment webhooks server-side, check signatures, enforce idempotency, and reconcile payments.
- Do not represent mock data as live tracking.
- Apply role-based access control and tenant boundaries before customer/admin features are added.
