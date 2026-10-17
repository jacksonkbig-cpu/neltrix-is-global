# Prisma/PostgreSQL rollout

This branch introduces the Prisma schema and logistics APIs, but does not silently migrate or delete the existing Supabase quote-intake and staff-auth system.

## Required before enabling Prisma routes
1. Provision managed PostgreSQL. Configure `DATABASE_URL` as the provider's pooled/runtime URL and `DIRECT_URL` as its direct/migration URL.
2. Install dependencies and generate the Prisma client: `npm install` then `npx prisma generate`.
3. Review the schema and create a migration in a controlled environment: `npx prisma migrate dev --name initial_logistics`.
4. Apply reviewed migrations in production: `npx prisma migrate deploy`.
5. Set `ENCRYPTION_KEY` and carrier/rate-limit secrets in the hosting provider. Never commit real values.
6. Test tracking with a seeded demo shipment and verify that mock results are disabled in production.
7. Keep the current Supabase staff authentication and quote-intake migration until a separately tested data migration and cutover plan is approved.

## Rate limiting and network trust
Use an edge/WAF rule and a shared rate-limit store for public tracking and quote endpoints. Do not rely on process-local counters in serverless deployments. Only trust client-IP headers injected by the hosting provider; arbitrary `X-Forwarded-For` values can be spoofed.

## Rollback
Do not drop Supabase tables as part of this rollout. Revert application routing independently, keep database backups, and perform any data migration with explicit reconciliation and rollback steps.
