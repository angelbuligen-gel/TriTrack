# TrikeTrack Database Design

## 1. What was inspected first

| Item | Finding |
| --- | --- |
| Active database (`.env` → `DB_DATABASE`) | `tritrack_db` on `127.0.0.1` (MySQL, XAMPP) |
| Existing tables in `tritrack_db` | `users`, `tritrack_users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `migrations`, `personal_access_tokens` |
| `users` rows | 0 before this change |
| `tritrack_users` rows | 0 (leftover duplicate table, included a forbidden `psd` role) |
| Second database on the same server | `tritrack_db_prc` — a 25-table reference schema, all tables empty. Used only as a design reference. |
| Laravel default table | `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, timestamps) |
| Existing feature | A Blade registration form wrote to `users` with `full_name`, `username`, `role`, `account_status` columns that did not exist — it could not have worked. |

## 2. Decisions

1. **One accounts table.** All four roles live in `users`. The abandoned `tritrack_users`
   table was dropped (it was empty and defined `psd`, which the system must not have).
   The drop is reversible through the migration's `down()`.
2. **Role as an enum column, not a `roles` table.** The role list is fixed at four values
   by the specification: `franchisee`, `bplo`, `treasury`, `administrator`.
3. **Mobile numbers are stored canonically** as `+639XXXXXXXXX` (unique). Input accepts
   `09XXXXXXXXX`, `9XXXXXXXXX`, `639XXXXXXXXX`, `+639XXXXXXXXX`.
4. **OTP codes are never stored in plain text** — only a bcrypt hash, with attempts,
   expiry, cooldown, revocation, and consumption tracked per record.
5. **History is append-only** for documents, applications, assessments, payments, and
   certificates (see planned tables).

## 3. Implemented in module 1

### `users` (extended)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `name` | varchar(255) | full name |
| `username` | varchar(50) NULL UNIQUE | optional for franchisees, used for staff |
| `email` | varchar(255) UNIQUE | login identifier |
| `mobile_number` | varchar(20) NULL UNIQUE | canonical `+63…`, required for franchisees |
| `email_verified_at` | timestamp NULL | |
| `phone_verified_at` | timestamp NULL | set only after a successful OTP check |
| `password` | varchar(255) | bcrypt |
| `role` | enum(4) | indexed, default `franchisee` |
| `account_status` | enum(`pending`,`active`,`suspended`,`rejected`) | indexed, default `pending` |
| `remember_token`, `created_at`, `updated_at` | | |

### `otp_verifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint PK | |
| `user_id` | FK → `users.id` ON DELETE CASCADE | |
| `purpose` | varchar(30) | `phone_verification` today; ready for other flows |
| `mobile_number` | varchar(20) | destination at issue time |
| `code_hash` | varchar(255) | hashed OTP, never the raw code |
| `attempts` / `max_attempts` | tinyint | wrong-entry counter and limit |
| `expires_at`, `last_sent_at` | datetime | validity and resend cooldown |
| `consumed_at`, `revoked_at` | datetime NULL | single-use and “newer code issued” invalidation |
| `ip_address` | varchar(45) NULL | audit of the requesting client |
| `created_at`, `updated_at` | | |

Indexes: `(user_id, purpose, consumed_at)`, `(mobile_number, purpose)`, `expires_at`.

### `personal_access_tokens`
Installed by Sanctum; holds API bearer tokens (hashed, per device).

## 4. Planned tables for later modules

Derived from the specification and the `tritrack_db_prc` reference schema. Each will be
added by its own migration when that module is built.

| Group | Tables |
| --- | --- |
| People | `franchisees` (profile linked 1:1 to `users`), `drivers` |
| Assets | `vehicles`, `franchise_vehicles` (assignment history), `franchise_drivers` (assignment history) |
| Franchise | `franchises` (franchise number, issue/expiry dates, status) |
| Applications | `renewal_applications`, `franchise_transfers`, `motor_change_applications` |
| Documents | `document_types`, `franchise_documents`, `renewal_documents`, `transfer_documents`, `motor_change_documents`, plus `document_extractions` (ML result per upload) |
| Fees & payments | `fee_types`, `assessments`, `assessment_items`, `payment_methods`, `payments`, `payment_events` (webhook/provider history) |
| Output | `certificates` (per approved application, unique certificate number, stored file path) |
| Cross-cutting | `notifications`, `activity_logs`, `offices` |

### Relationship summary

```
users 1—1 franchisees 1—N franchises 1—N renewal_applications 1—N renewal_documents
                                   1—N franchise_transfers   1—N transfer_documents
                                   1—N motor_change_applications 1—N motor_change_documents
renewal_applications 1—1 assessments 1—N assessment_items
assessments 1—N payments
applications 1—0..1 certificates
documents 1—0..1 document_extractions
users 1—N activity_logs / notifications
```

Document tables keep **one row per upload** (no overwriting), so the franchisee's
document submission history stays intact and is filterable by year, date, and application
type.
