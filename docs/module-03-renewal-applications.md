# Module 3 — Franchise Renewal Applications & Document History

Status: implemented and verified against MySQL.

Renewal is the first of the three application types; transfer and change motor reuse every
piece built here (application record, document checklist, status log, decision flow).

## Database

| Table | Purpose |
| --- | --- |
| `applications` | One row per filed application. `application_type` covers renewal, transfer, change motor. Holds `reference_number`, `status`, coverage year, previous expiry, remarks, timestamps, and the deciding user. |
| `document_requirements` | Configurable checklist per application type (`renewal`, `transfer`, `change_motor`), seeded by `DocumentRequirementSeeder`. |
| `application_documents` | **Append-only** submission history. One row per upload, with original name, private storage path, MIME type, size, review status/remarks, and ML result columns reserved for Module 6. |
| `application_status_logs` | Every transition and document action with actor, remarks, and timestamps. |

`application_documents.uploaded_at` is a `DATETIME`, not `TIMESTAMP`. MariaDB gives the first
`TIMESTAMP` column an implicit `ON UPDATE CURRENT_TIMESTAMP`, which silently rewrote the
submission time whenever BPLO reviewed a document. Migration `…_100400_…` converts the
application timestamp columns for that reason.

The application links `franchise_id` (the franchise being renewed) and `franchisee_id` (who
filed it). A franchise can only have one open application of a given type at a time.

## Application statuses

`submitted` → `under_review` → `approved` / `rejected`, plus `documents_pending` when BPLO
asks for corrections or rejects a document. Uploading after a correction request returns the
application to `submitted` (`resubmitted` log entry).

## Business rules (`app/Services/ApplicationWorkflow.php`)

- **Reference numbers**: `RNW-2026-0001`, generated per type and year, retried on collision.
- **Eligibility**: cancelled, suspended, or transferred franchises cannot renew; an open
  renewal blocks a second filing (HTTP 409).
- **Checklist state** is derived from the *latest* submission per requirement: `missing`,
  `pending`, `approved`, or `rejected`. Older submissions stay in the history and never affect
  the current state.
- **Approval is blocked** until every required checklist item is approved (409 with the reason).
  Rejecting a document on an application under review moves it to `documents_pending`.
- **Approving a renewal** sets the franchise expiration to 31 December of the coverage year and
  returns the franchise to `active`, inside the same transaction as the status change.
- **All uploads are kept.** Replacing a document inserts a new row; nothing is overwritten.

## Storage

Files go to the private `local` disk (`storage/app/private/applications/{id}/…`) with a UUID
filename. They are never publicly served. Both roles stream them through the API with an
`inline` disposition for preview or `attachment` for download, and the MIME type is re-sent
with `X-Content-Type-Options: nosniff`. Allowed uploads: PDF, JPG, PNG, WEBP, up to 10 MB.

## API endpoints

Franchisee (`auth:sanctum`, `role:franchisee`):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/my/applications` | Own applications, filterable by type/status/search, paginated |
| GET | `/api/my/applications/{application}` | Detail: checklist, document history, status timeline |
| GET | `/api/my/renewal-options` | Own franchises with eligibility, suggested coverage year, checklist |
| POST | `/api/my/applications/renewal` | File a renewal |
| POST | `/api/my/applications/{application}/documents` | Upload a document for a requirement |
| GET | `/api/my/documents/{document}/file` | Preview/download, owner only |

BPLO (`auth:sanctum`, `role:bplo,administrator`):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/bplo/applications` | Queue with type/status/search/date filters, paginated |
| GET | `/api/bplo/applications/stats` | Dashboard counters and recent applications |
| GET | `/api/bplo/applications/{application}` | Full detail with documents and history |
| POST | `/api/bplo/applications/{application}/start-review` | submitted → under review |
| POST | `/api/bplo/applications/{application}/request-correction` | → documents pending (remarks required) |
| POST | `/api/bplo/applications/{application}/decision` | approve/reject (reason required to reject) |
| GET | `/api/bplo/documents` | Cross-application review queue, pending first |
| POST | `/api/bplo/documents/{document}/review` | Approve/reject one upload |
| GET | `/api/bplo/documents/{document}/file` | Preview/download |

Responses use the standard envelope; list responses add `meta.current_page`, `per_page`,
`total`, `last_page` (the document queue also reports `pending_total`).

## Frontend

| Route | Page |
| --- | --- |
| `/app/renewal` | Franchisee renewal: eligibility per franchise, filing dialog, requirements, renewal history, detail dialog with uploads |
| `/app/applications` | Application tracking: filters, progress column, detail dialog with checklist, document history, timeline |
| `/bplo/renewals` | Renewal management: filters, counters, detail dialog with document review, correction request, approve/reject |
| `/bplo/documents` | Document review queue: pending-first list, inline preview, approve/reject with remarks |

Shared components: `ApplicationDetail` (both roles; staff controls appear only for BPLO) and
`DocumentPreview` (blob fetch, inline image/PDF view, download). The BPLO dashboard now shows
open applications, documents awaiting review, approvals, and recent filings.

## Verified

- File renewal → `RNW-2026-0001` (201); duplicate filing → 409.
- Upload of 5 required documents; missing optional document reported as `missing`, not blocking.
- Approval attempt before document review → 409 with reason.
- Rejecting a document → application `documents_pending`; re-upload creates a new row
  (`submission_count = 2`) while the rejected row keeps its remarks; application returns to
  `submitted`.
- Approving all documents then the application → status `approved`, franchise expiry extended
  to `2028-12-31`, full log history preserved.
- Final decision on a decided application, uploads to a decided application, and reviews of its
  documents all return 409.
- Document preview returns `application/pdf` inline; staff download returns `attachment`.
- BPLO token on `/api/my/*` → 403; franchisee token on `/api/bplo/*` → 403.
- `npm run lint` 0 warnings, `npm run build` passes.

Not covered yet: ML extraction (Module 6), fee assessment and payment (Module 7), certificates
(Module 8). Test records were removed after verification, so franchises show their original
expiry dates.
