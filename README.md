# NELTRIX I.S. Global — website starter

A deployable Next.js starter for an international shipping business. It contains a responsive marketing site, shipment tracking lookup UI, quote request UI, and clear placeholder states. It is **not yet a live shipping platform**: tracking data, rate calculations, booking, authentication, payments, carrier APIs, and database persistence are not implemented.

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
npm run build
npm start
```

## Current status
Implemented:
- Responsive landing page and services overview
- Tracking-number form with explicit “integration not connected” result
- Quote request form with client-side validation and an explicit non-submission notice
- Domain/production setup documentation

Not implemented / not live:
- No account creation or sign-in
- No real-time shipment tracking or carrier connection
- No shipment creation, rates, labels, pickup dispatch, driver app, or operations console
- No crypto payments or wallet monitoring
- No database, email/SMS notifications, or customer data persistence
- No production deployment or domain registration

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
