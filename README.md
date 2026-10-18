# NELTRIX I.S. Global

A Next.js 15 / React 19 / TypeScript web application for NELTRIX I.S. Global. The production site is deployed on Vercel and connected to a Supabase-hosted PostgreSQL database.

## Production

- Website: https://neltrix-is-global.vercel.app
- Health check: https://neltrix-is-global.vercel.app/api/health
- Staff quote review: https://neltrix-is-global.vercel.app/ops/login
- Admin operations: https://neltrix-is-global.vercel.app/login

The health endpoint checks database connectivity and required schema presence. It does not certify that all customer-facing or staff workflows have passed end-to-end tests.

## Implemented foundations

- Responsive public website and quote-request form.
- Server-side validation for quote requests and indicative shipment estimates.
- Supabase quote-intake tables, row-level security, staff profiles and a rate-limited database function.
- Server-side Prisma schema for shipment records, indicative calculator quotes, support tickets/messages and audit events.
- Tracking lookup endpoint; a nonexistent test tracking number correctly returns not found.
- Staff-only shipment management and customer support inbox routes.
- Security headers and a health endpoint.
- GitHub Actions checks for lint, TypeScript, unit tests and production build.

## Current operational limits

This is not yet a complete, launch-ready shipping platform.

- **Quote intake:** the production endpoint now calls the locked-down database intake function through the server's Prisma connection, avoiding a dependency on a Supabase service-role API key. A successful real submission still needs an end-to-end synthetic test.
- **Staff access:** no Supabase Auth users were present during the latest check. Staff invitation and role assignment must be completed before the workspaces can be used.
- **Separate role systems:** quote review uses `public.profiles.role = 'ops'`; the shipment/support/admin workspace checks trusted Supabase `app_metadata.role` values. These are separate permissions and must be assigned deliberately.
- **Customer support notifications:** the inbox can persist replies and internal notes, but email delivery is not verified/configured. Do not assume a saved reply has been emailed to a customer.
- **AI chat:** without `OPENAI_API_KEY`, the assistant returns a transparent fallback and directs customers to human support.
- **Rate limiting:** the current fallback is per serverless isolate. A shared Redis-compatible store is recommended for consistent distributed limits.
- **Shipping integrations:** live carrier tracking, carrier-confirmed pricing, bookings, labels, pickup dispatch and customer self-service are not yet production-verified.
- **Payments:** payment processing and crypto payments are not enabled.

## Local development

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run checks before release:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

See [Supabase setup and operational controls](docs/SUPABASE-SETUP.md) for the schema, environment variables, staff roles and launch checklist.

## Security rules

- Never commit secrets or share them in chat.
- Never put service-role, database, carrier, email or AI keys in `NEXT_PUBLIC_*` variables.
- Do not grant public execution of the quote-intake `SECURITY DEFINER` function.
- Keep operational tables inaccessible to browser roles; access them through authenticated, server-side routes.
- Use synthetic records for tests and do not represent test data as real shipments or customer enquiries.
