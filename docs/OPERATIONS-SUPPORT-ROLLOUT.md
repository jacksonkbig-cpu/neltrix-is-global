# Operations and support platform rollout

This release adds the first staff operations layer, support ticket storage, the AI chat UI, and an optional EasyPost adapter. It is deliberately staged: label purchasing remains disabled unless explicitly enabled, and live AI/carrier features require private server-side credentials.

## Before production migration

1. Review the migration files in chronological order:
   - `202610170002_support_operations` adds PostgreSQL enum values only.
   - `202610170003_support_tables` adds tickets/messages, audit linkage, and the indicative quote default.
   - `202610170004_shipment_notes` adds private internal shipment notes.
2. Take a managed PostgreSQL backup and verify restore capability.
3. Apply migrations to a staging database first with `npx prisma migrate deploy`.
4. Verify `npx prisma generate`, `npm run typecheck`, `npm test`, and `npm run build` on the exact commit before production.
5. Only then apply `npx prisma migrate deploy` in production through a reviewed deployment job. Do not run `prisma migrate dev` against production.

## Vercel environment variables

Configure in Project Settings → Environment Variables, separately for Preview and Production. Never commit actual values.

- `DATABASE_URL`: pooled PostgreSQL connection for runtime.
- `DIRECT_URL`: direct PostgreSQL connection for migrations.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase staff sign-in.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only, retained for existing quote intake.
- `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN`: shared Upstash REST endpoint/token. Production API requests fail closed if rate limiting is not configured.
- `EASYPOST_API_KEY`: private EasyPost API key. Tracking and live rates remain unavailable until configured.
- `OPENAI_API_KEY`: private OpenAI key for streamed assistant responses. Without it, the widget returns a clearly labelled non-AI fallback.
- `SUPPORT_NOTIFICATION_WEBHOOK_URL`: optional HTTPS webhook for new support tickets.
- `ENCRYPTION_KEY`: 32 random bytes, 64 hex characters if using hex encoding.
- `ENABLE_MOCK_TRACKING=false` in Production.
- `ENABLE_LABEL_PURCHASES=false` until billing, address validation, carrier terms, and staff approval procedures are verified.

## Staff role assignment

The login page authenticates against Supabase. Authorization reads the trusted Supabase `app_metadata.role` claim; it never trusts user-editable `user_metadata`.

Assign `ADMIN`, `OPERATIONS_STAFF`, or `CARRIER` only using a trusted Supabase admin workflow or server-side administrative API. Do not let a client signup form set `app_metadata.role`. The `/admin/audit` view is restricted to `ADMIN`.

## Carrier behavior and purchase safety

- The EasyPost adapter has a 5-second upstream timeout and validates provider responses.
- Carrier rates are returned as `CARRIER_QUOTE` and are not binding until a purchase is accepted by the carrier.
- Label purchase code is guarded by `ENABLE_LABEL_PURCHASES=true`; keep it false until production billing and a human approval process are tested.
- Test provider timeouts, invalid responses, duplicate tracking numbers, and failed database writes in Preview/sandbox before any live label purchases.

## Support and privacy

- The AI widget does not promise rates or shipment states without trusted data.
- Human handoff persists a ticket and the recent chat transcript.
- Internal notes are marked as private and displayed only in the staff dashboard.
- Configure a retention policy for tickets, transcripts, IP addresses, and audit events; minimize personal data and restrict dashboard access.
- Webhook delivery is best-effort; monitor failed notifications separately.

## Launch verification

- [ ] Staff can sign in and only trusted app metadata roles reach admin pages and mutation APIs.
- [ ] Shipment status/tracking changes create audit entries; internal notes never appear in public tracking responses.
- [ ] Ticket handoff creates a ticket and messages; admin replies and private notes persist correctly.
- [ ] Redis rate limits return 429 when exceeded and 503 when unavailable in production.
- [ ] Health endpoint reports PostgreSQL status; backup and restore tested.
- [ ] EasyPost sandbox tracking/rates tested; mock tracking disabled in production.
- [ ] Confirm security headers, HTTPS, CSP, dependency scan, and alerting.
