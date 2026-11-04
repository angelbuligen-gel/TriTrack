# TrikeTrack module roadmap

Approval framework: one module at a time, stop at the gate, wait for confirmation.

## Current

**Modules 1-8 are built and wired end to end.** Module 3 remains the strongest reference implementation; modules 4-8 now cover transfer, change motor, ML extraction, fees/payments/treasury, and certificates/reports/admin. Frontend queues and self-service pages are present for the approved module set.

## Remaining

| # | Module | Status |
| --- | --- | --- |
| 4 | Franchise Transfer | Complete backend + franchisee/BPLO queues, frontend transfer and change-motor pages. |
| 5 | Change Motor | Complete backend + franchisee/BPLO queues, frontend transfer and change-motor pages. |
| 6 | ML extraction | Complete backend extraction + BPLO confirm flow, frontend ML editor. |
| 7 | Fees, payments, treasury | Complete backend assessment/payment/webhook flow, frontend treasury and franchisee payment pages. |
| 8 | Certificates, reports, admin | Complete backend issuance/report flows, frontend management pages. |

## Items not yet on the spec's 4 roles

- Extra user roles are out of scope — there are exactly four: Franchisee, BPLO, Treasury, Administrator.

## Blockers to decide (don't block module 4)

- Payment provider (PayMongo / Xendit / Maya) — needed at module 7.
- Real SMS provider for OTP delivery — dev driver in place for now.

## Evidence trail

- README.md → live status table (kept current after each module)
- docs/database-design.md → schema + relationships
- docs/module-01 / 02 / 03 → per-module deliverables + Postman-friendly API notes
- docs/TrikeTrack.postman_collection.json → test calls
