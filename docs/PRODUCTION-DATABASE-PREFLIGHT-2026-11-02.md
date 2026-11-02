# Production database preflight — 2026-11-02

**Project:** NELTRIX I.S. Global  
**Database:** Supabase PostgreSQL project (read-only inspection)  
**Purpose:** establish a safe production migration baseline before applying Phase 1.

No database writes, DDL, role grants, migration resolution, or data changes were performed for this report.

## Migration ledgers

The Supabase migration history reports these eight applied migrations:

| Version | Migration |
|---|---|
| 20261017095709 | initial_quote_intake |
| 20261017095736 | secure_internal_schema |
| 20261017095757 | private_rate_limit_policy |
| 20261018012643 | harden_security_definer_rpc_acl |
| 20261018014659 | add_prisma_logistics_schema |
| 20261018014817 | restrict_prisma_table_api_access |
| 20261018161624 | restrict_public_quote_request_privileges |
| 20261020075908 | revoke_public_execution_is_ops_user |

The public `public._prisma_migrations` table is absent. A public `public.schema_migrations` table is also absent. Supabase's migration ledger is not a substitute for Prisma's migration ledger.

The repository contains four historical Prisma migrations:

- `202610170001_initial_logistics`
- `202610170002_support_operations`
- `202610170003_support_tables`
- `202610170004_shipment_notes`

Do not run `prisma migrate deploy` on production until these four migration files have been reconciled object-by-object with the live database and safely baselined.

## Existing schema observed

All seven original Prisma application tables exist:

- `User`
- `Shipment`
- `ShipmentNote`
- `Quote`
- `Ticket`
- `ChatMessage`
- `AuditLog`

Their observed column sets match the original logistics/support model. The expected baseline indexes were present, including unique email, tracking number and ticket number indexes, plus the shipment, quote, support-message, shipment-note and audit lookup indexes.

Observed enums match the original Prisma definitions:

- `UserRole`: USER, ADMIN, OPERATIONS_STAFF, CARRIER
- `ShipmentStatus`: PENDING, IN_TRANSIT, DELIVERED, EXCEPTION
- `QuoteStatus`: PENDING, PRICED, REJECTED, EXPIRED, INDICATIVE, BINDING, ACCEPTED
- `TicketStatus`: OPEN, IN_PROGRESS, RESOLVED
- `TicketPriority`: LOW, NORMAL, HIGH, URGENT
- `ChatSender`: CUSTOMER, AI, ADMIN

The live `User.passwordHash` column is still NOT NULL. The Phase 1 schema changes it to nullable to accommodate Supabase Auth identities without a local password hash; the additive migration includes the corresponding `ALTER COLUMN ... DROP NOT NULL`.

The live `ShipmentStatus` enum has only the four legacy values. Phase 1 adds the additional lifecycle values without removing or renaming the legacy labels.

No Phase 1 tables were present at inspection time, including `Organization`, `Address`, `ShipmentPackage`, `ShipmentEvent`, `Role`, `Permission`, `RolePermission`, `RoleAssignment` and `IdempotencyRecord`.

## Security posture observed

RLS was enabled on all seven original application tables.

The inspection found no entries in `pg_policies` for those seven tables. The table-grant inspection returned privileges for `service_role` and `postgres`, and no table-grant rows for `anon` or `authenticated`.

Interpretation: direct browser-role table access is not configured through policies or grants in this inspected set. The application is expected to use a server-side privileged database connection. Keep all database credentials server-only and do not expose a service-role or database password to browser code.

## Existing data to preserve

Read-only row counts at inspection:

| Table | Rows |
|---|---:|
| User | 0 |
| Shipment | 0 |
| Quote | 1 |
| Ticket | 0 |
| ShipmentNote | 0 |

The one saved quote must be preserved. These counts are not grounds for resetting the schema or reseeding production.

## Safe next migration procedure

1. Verify a recoverable database backup and a restore path.
2. Compare each historical Prisma migration's SQL against the live tables, columns, enum values, indexes, foreign keys and constraints. This report verifies key objects but is not yet a complete checksum-by-checksum proof of all historical SQL.
3. Verify each historical migration file checksum.
4. Use `prisma migrate resolve --applied` only for a migration whose DDL is already proven to be present exactly as expected.
5. Run `prisma migrate status` and confirm a consistent baseline.
6. Apply the Phase 1 migration in a controlled release and immediately verify all added objects and constraints.
7. Test append-only shipment event behavior, unique event keys, organization membership constraints, role scope checks, and idempotency-key uniqueness.

Do not create a fake migration ledger, mark migrations applied without proof, drop/recreate tables, truncate data, or run `prisma migrate reset` against production.
