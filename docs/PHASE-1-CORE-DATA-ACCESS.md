# Phase 1 — Core data and access foundation

**Branch:** `feat/phase-1-core-data-access`  
**Migration:** `202611020001_phase1_core_domain`  
**Scope:** additive data-model foundation only. No production migration is executed by this change.

## What this phase adds

- Supabase identity linkage via nullable, unique `User.authSubject`; `passwordHash` becomes nullable so managed-auth users do not require a locally stored password hash.
- Business/individual organizations and organization membership roles.
- Reusable customer and organization addresses with optional provider-validation metadata.
- Multiple package records per shipment, using integer grams and millimetres and minor-unit declared values.
- A dedicated shipment event history with source, original carrier code, provider reference, occurrence/ingestion timestamps, location and metadata.
- Append-only enforcement for shipment events at the database level. Corrections are new events; old events are not edited or deleted.
- A permission catalog, system role templates, organization-scoped role assignments and explicit role-permission joins.
- An idempotency-record table for retry-safe API operations.
- Expanded shipment lifecycle values while retaining the legacy `PENDING`, `IN_TRANSIT`, `DELIVERED` and `EXCEPTION` values.

## Security and compatibility decisions

- No user is automatically granted a new role. The migration seeds role/permission definitions only; role assignment requires an explicit trusted administrative workflow.
- Existing Supabase staff authorization and customer sign-in flows remain in place for compatibility. The new RBAC tables are the foundation for a later, separately tested authorization cutover; this change does not claim that every existing endpoint now enforces the new permission catalog.
- New tables have RLS enabled and direct `anon`/`authenticated` table privileges revoked. Server-side database access remains the intended application path.
- Existing shipment records are not rewritten. The new address, organization, package and carrier-reference columns are nullable to permit staged backfill.
- Money fields added to shipments and packages use integer minor units and explicit currency where supplied. Quote's existing indicative-decimal fields are retained for backwards compatibility until its pricing contract is migrated.
- Events are immutable. The database trigger also means hard-deleting a shipment with event history is intentionally blocked by the foreign key.

## Not included yet

This phase does not implement the booking wizard, payment capture, live carrier label purchase, webhook receiver, status-transition service, dispatch board, driver app, proof-of-delivery upload, notification queue, invoice ledger or refunds. The tables prepare for those features; they do not make those workflows operational by themselves.

## Required verification

1. CI must pass lint, TypeScript/Prisma generation, unit tests and production build.
2. Review the migration SQL against the target PostgreSQL schema.
3. Reconcile the existing Prisma migration history before deployment. On 2026-11-02 the production project had the existing logistics tables but no `public._prisma_migrations` table. Do not run `prisma migrate deploy` until the four existing Prisma migrations are verified and safely baselined.
4. Apply the migration only in a controlled database release after a backup and migration-status check.
5. Run read/write tests for organization membership scoping, address ownership, package validation, event append-only behavior, event deduplication keys and idempotency-key uniqueness.
6. In a later implementation phase, connect permission checks to every protected API operation before treating the new RBAC catalog as active authorization.
