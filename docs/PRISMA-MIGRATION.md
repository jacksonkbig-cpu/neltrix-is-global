# Prisma/PostgreSQL rollout

## Current production migration state

The production Supabase project currently contains the Prisma logistics tables created by the Supabase migration `20261018015000_add_prisma_logistics_schema`, but the public `_prisma_migrations` table was not present during the Phase 1 preflight check (2026-11-02).

**Do not run `npx prisma migrate deploy` against production until the existing schema has been reconciled and the four historical Prisma migrations have been safely baselined.** Without that work Prisma may treat the old migrations as unapplied and attempt to create tables that already exist.

The Supabase migration history and Prisma migration history are separate systems. A migration appearing in Supabase's migration list does not mean Prisma has recorded it in `_prisma_migrations`.

## Required preflight before any production migration

1. Take/verify a recoverable database backup.
2. Compare every object in `prisma/migrations/202610170001_initial_logistics`, `202610170002_support_operations`, `202610170003_support_tables`, and `202610170004_shipment_notes` with the live PostgreSQL schema, including enum values, columns, indexes, constraints, and foreign keys.
3. Confirm the existing data is compatible with the current Prisma schema.
4. Confirm the exact migration history and checksums before baselining. Use `prisma migrate resolve --applied <migration_name>` only after the corresponding SQL is proven to have been applied already. Do not mark a migration applied merely to silence Prisma.
5. Run `npx prisma migrate status` after baseline reconciliation. It must report a consistent history before new migrations are applied.
6. Only then apply a reviewed additive migration with `npx prisma migrate deploy` in a controlled release window.

## Environment and client generation

- `DATABASE_URL` must be the pooled/runtime URL.
- `DIRECT_URL` must be the direct/migration URL.
- Run `npm install` and `npx prisma generate` after schema changes.
- Keep the Supabase staff authentication and quote-intake migrations until a separately tested data migration and cutover plan is approved.
- Never commit real credentials or production environment files.

## Phase 1 migration

The migration `202611020001_phase1_core_domain` is additive. It adds customer identity linking, organizations, organization memberships, reusable addresses, package records, append-only shipment events, a permission catalog, scoped role assignments, and idempotency records. It also expands the shipment status enum while preserving the legacy values.

The migration is intentionally not applied by CI or Vercel. Review and baseline reconciliation are required first.

## Rate limiting and network trust

Use an edge/WAF rule and a shared rate-limit store for public tracking and quote endpoints. Do not rely on process-local counters in serverless deployments. Only trust client-IP headers injected by the hosting provider; arbitrary `X-Forwarded-For` values can be spoofed.

## Rollback

Do not drop Supabase tables as part of this rollout. Prefer forward-only corrective migrations for production data. Reverting application routing is separate from reverting database structure; keep verified backups and test restore procedures before relying on them.
