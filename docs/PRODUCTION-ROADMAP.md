# NELTRIX I.S. Global — Production Roadmap

## Purpose and current state

This repository currently contains a Next.js website starter. It is not yet a live courier or freight platform. The public-facing UI must never imply that a shipment has been booked, paid for, dispatched, or tracked unless the corresponding backend operation has actually succeeded.

Current stack recorded in package.json:
- Next.js 15
- React 19
- TypeScript
- ESLint

## Product direction

- Initial market focus: Brazil and the United States.
- Initial corridor planning: Brazil → United States and United States → Brazil, activated only after the company verifies operational coverage, carrier service, pricing, customs process, and legal requirements.
- Delivery model: NELTRIX operations plus contracted carrier/shipping partners.
- Initial payment direction: a third-party crypto payment processor with hosted checkout and verified server-side webhooks. Add other methods later through integrations.
- Exclude African routes from the initial launch scope unless the business explicitly revises that decision.

These are product decisions and planning assumptions, not proof that the company is licensed or that a route is currently serviceable.

## Milestone 0 — Protect and understand the codebase

- Keep the existing `main` branch intact while changes are reviewed.
- Work on short-lived feature branches and open pull requests.
- Record actual behavior separately from planned features.
- Run dependency installation, lint/type checks, and a production build in a controlled environment before deployment.
- Never commit secrets, credentials, private keys, wallet seed phrases, customer data, or production environment files.

## Milestone 1 — Product, legal, and operations readiness

Before accepting real shipments or money:
- Confirm the legal operating entity, jurisdictions, licensing obligations, insurance, terms of service, privacy notice, prohibited-goods rules, claims/refund policy, and customs responsibilities with qualified professionals.
- Confirm brand, domain, corporate-name, trademark, and social-handle availability. The name is not considered legally cleared until searches and professional review are complete.
- Define supported origin/destination postal codes, parcel size/weight limits, service levels, delivery estimates, cut-off times, exceptions, and return handling.
- Select real carrier/forwarder partners and obtain documented commercial terms and production API access where available.
- Define who owns customer support, lost/damaged shipment claims, customs documentation, and operational escalations.

## Milestone 2 — Secure application foundation

Implement and verify:
- Managed PostgreSQL database with migrations and backups.
- Authentication and role-based authorization for customers, operations staff, administrators, and any delivery personnel.
- Server-side validation for every form and API endpoint.
- Audit trail for important actions and status changes.
- Rate limiting, abuse prevention, secure session/cookie settings, CSRF protections where applicable, security headers, and safe error messages.
- Data minimization, retention/deletion policy, and appropriate privacy controls.
- Separate development, staging, and production environments with secrets held only in server-side environment configuration.

## Milestone 3 — Quotes and shipment records

- Build a versioned quote model with origin, destination, parcel dimensions/weight, service, currency, quote expiry, and price breakdown.
- Do not invent rates. Return a price only when it comes from an approved rate table or a real carrier/operations quote.
- Store shipment records only after a validated booking flow completes.
- Generate unique shipment references and labels only when supported by the selected carrier/operations process.
- Make quote submission, booking, and label creation idempotent to prevent duplicate actions.
- Keep a clear distinction between a quote request, confirmed booking, paid shipment, and dispatched parcel.

## Milestone 4 — Tracking and carrier integration

- Define a normalized shipment-event model and map each carrier's statuses into it.
- Verify webhook signatures or use authenticated polling according to each carrier's supported integration.
- Validate inbound event data, deduplicate events, preserve event timestamps/time zones, and log integration failures without leaking secrets.
- Show “tracking unavailable” or “awaiting carrier update” when no verified event exists; never fabricate scans or delivery estimates.
- Provide a manual operations workflow for exceptions when carrier APIs are unavailable.

## Milestone 5 — Payments

- Select a reputable third-party crypto processor only after legal, accounting, sanctions/AML, refund, and volatility requirements are reviewed.
- Prefer provider-hosted checkout; never collect wallet seed phrases or private keys.
- Verify webhook signatures on the server, enforce idempotency, store provider event IDs, and reconcile payment state with provider records.
- Treat browser redirects as informational only; a return page is not proof of payment.
- Define underpayment, overpayment, expiry, refund, chargeback/dispute where applicable, and payment-failure handling.
- Do not mark a shipment as paid until the server has verified the provider's authoritative payment event.

## Milestone 6 — Customer and operations workflows

- Customer: account, quote history, shipment booking, payment status, verified tracking events, support/claims.
- Operations: shipment queue, exception handling, manual status with audit reason, carrier references, customer communications, refunds/escalations.
- Delivery personnel: only if the operating model requires it; restrict access to assigned jobs and the minimum customer information needed.
- Email/SMS notifications: send only from server-side events, with delivery logs, retry handling, and customer preferences.

## Milestone 7 — Quality and launch gate

Do not call the platform production-ready until:
- A clean production build passes in CI.
- Automated tests cover authorization, quote calculation, booking idempotency, payment webhook verification, tracking event processing, and failure paths.
- Database migrations and backup/restore are tested.
- Secrets and dependency/security scans are checked.
- Staging tests cover both intended corridors with real partners and end-to-end operational sign-off.
- Pricing, customs documentation, delivery expectations, refunds, customer support, incident response, monitoring, and alerts are documented.
- Production domain, TLS, analytics/privacy choices, uptime checks, error reporting, and rollback procedure are verified.
- A limited pilot has been accepted by the business owner and operations team.

## Immediate engineering sequence

1. Inventory all tracked source files and inspect current page behavior.
2. Run lint, TypeScript checks, and a production build; fix verified failures.
3. Improve accessibility, metadata, form error handling, and responsive states without suggesting that mock forms submit data.
4. Add CI checks and security/dependency hygiene.
5. Design database schema and API contracts before choosing/connecting live providers.
6. Implement one vertical slice at a time, with tests and a reviewable pull request.
7. Integrate real carriers and payment processor only after accounts, API documentation, credentials, and operational decisions are available.

## Definition of done for every feature

- The UI reflects authoritative server state.
- Inputs are validated on the server, not only in the browser.
- Authentication and authorization are tested.
- Errors, retries, duplicate requests, and external service outages are handled.
- Logs are useful but contain no secrets or unnecessary personal data.
- Tests and build checks pass.
- Documentation explains setup, environment variables, limitations, and operational ownership.
- The change is reviewed before merge and is not described as live until verified in the target environment.

## Current implementation truth

The README currently describes a starter UI. Unless code and live integrations prove otherwise, assume there is no real customer authentication, quote persistence, booking, carrier tracking, payment collection, dispatch workflow, notification delivery, or production deployment. Keep these limitations visible until each capability is implemented and tested.
