# Module 1 — Project setup, authentication API, and SMS OTP registration

## What this module delivers

1. A working Laravel 13 REST API on PHP 8.4 with Sanctum token authentication.
2. A consolidated `users` table for the four roles and an `otp_verifications` table.
3. Franchisee registration with **SMS OTP verification of the mobile number**.
4. Role-aware authorization middleware and JSON error envelopes for every API route.
5. A separate React (Vite) application with Login, Registration, OTP verification,
   Registration Success, and role dashboards wired to the real API.

## Project structure

```
TriTrack/                      ← Laravel 13 REST API (this repository root)
├── app/
│   ├── Contracts/SmsSender.php
│   ├── Exceptions/{OtpException,SmsDeliveryException}.php
│   ├── Http/
│   │   ├── Controllers/Api/AuthController.php
│   │   ├── Middleware/EnsureUserHasRole.php
│   │   ├── Requests/Auth/{Register,VerifyOtp,ResendOtp,Login}Request.php
│   │   └── Resources/UserResource.php
│   ├── Models/{User,OtpVerification}.php
│   ├── Providers/AppServiceProvider.php
│   ├── Services/OtpService.php
│   ├── Services/Sms/{SemaphoreSmsSender,LogSmsSender}.php
│   └── Support/{ApiResponse,PhoneNumber}.php
├── config/{otp,sms,cors}.php
├── database/migrations/2026_11_02_*  (3 new migrations)
├── database/seeders/{DatabaseSeeder,StaffAccountSeeder}.php
├── routes/{api,web}.php
├── ml-service/                ← Python document-extraction service (unchanged, module 5)
├── TrikeTrack-Frontend/       ← separate React application
└── docs/
```

**Note on the required folder names:** the Laravel backend already lived at the repository
root (`C:\xampp\htdocs\TriTrack`) with its installed `vendor/`, `.env`, and XAMPP path.
Moving it into a `TrikeTrack-Backend/` folder would break the working install for no
functional gain, so the backend stays at the root, and the React app lives in its own
`TrikeTrack-Frontend/` folder. The ML service stays in `ml-service/`.

## Environment

A project-local PHP 8.4 toolchain was installed at `.tools/php` (git-ignored) because the
machine's only PHP was XAMPP's 8.1, which Laravel 13 refuses to run.

```sh
# Every backend command in this project uses the local PHP 8.4 binary:
.tools/php/php.exe artisan ...
```

To make it permanent, add `C:\xampp\htdocs\TriTrack\.tools\php` to `PATH`, or keep using
the explicit path.

### Backend commands

```sh
cd C:\xampp\htdocs\TriTrack

.tools/php/php.exe artisan migrate            # apply new migrations
.tools/php/php.exe artisan db:seed            # create the three staff accounts
.tools/php/php.exe artisan serve --host=127.0.0.1 --port=8000
```

### Frontend commands

```sh
cd C:\xampp\htdocs\TriTrack\TrikeTrack-Frontend
npm install
npm run dev        # http://localhost:5173
npm run build
```

## API endpoints

Base URL: `http://127.0.0.1:8000/api`

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | Service check |
| POST | `/auth/register` | — | Create pending franchisee + send OTP |
| POST | `/auth/verify-otp` | — | Verify the 6-digit code, set `phone_verified_at` |
| POST | `/auth/resend-otp` | — | Issue a new code (cooldown + hourly cap) |
| POST | `/auth/login` | — | Returns Sanctum token + user |
| GET | `/auth/me` | Bearer | Current account |
| POST | `/auth/logout` | Bearer | Revoke current token |

### Response envelope

```json
{ "status": "success", "message": "…", "data": { } }
{ "status": "error", "message": "…", "errors": { "field": ["…"] } }
```

### Registration payload

```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "mobile_number": "09171234567",
  "password": "Passw0rd123",
  "password_confirmation": "Passw0rd123"
}
```

The response contains the created account and a `verification` block with the **masked**
number, `expires_at`, `expires_in_seconds`, `resend_available_in`, and
`attempts_allowed`. The OTP itself is never returned by the API.

## OTP rules implemented

| Requirement | Implementation |
| --- | --- |
| 6-digit random code | `random_int` with zero padding (`OtpService::generateCode`) |
| Never stored in plain text | bcrypt hash in `otp_verifications.code_hash` |
| Expiry | `OTP_EXPIRY_MINUTES` (default 5), checked server-side |
| Single use | `consumed_at` set on success; reuse returns `otp_used` |
| New code invalidates old | previous active rows get `revoked_at` |
| Resend cooldown | `OTP_RESEND_COOLDOWN_SECONDS` (default 60) → HTTP 429 + `retry_after` |
| Send cap | `OTP_MAX_SENDS_PER_HOUR` (default 5) per account |
| Attempt limit | `OTP_MAX_ATTEMPTS` (default 5), counter persisted in DB |
| Delivery failures | `SmsDeliveryException` → HTTP 502, registration rolled back |
| No OTP in responses | code is only passed to the SMS body |
| Number privacy | API returns only masked numbers; log driver logs masked numbers |
| Unverified accounts | franchisee login blocked with `phone_unverified` (403) |
| Verification ≠ approval | `account_status` stays `pending` after verification; an administrator activates accounts later |

### SMS provider

**Semaphore** (Philippine gateway, free signup credits) was selected as the real driver,
wrapped behind `App\Contracts\SmsSender`.

```dotenv
SMS_DRIVER=log                       # log | semaphore
SEMAPHORE_API_KEY=                   # from https://semaphore.co
SEMAPHORE_SENDER_NAME=TrikeTrack     # must match a registered sender name
```

`SMS_DRIVER=log` writes outgoing messages to `storage/logs/laravel.log` — **development
only**, it lets the whole flow be tested without an SMS account. Set `SMS_DRIVER=semaphore`
and the API key to send real SMS.

## Database changes

Three migrations, in order:

| Migration | Change |
| --- | --- |
| `2026_11_02_080000_add_tritrack_account_fields_to_users_table` | adds `username`, `mobile_number`, `role`, `account_status`, `phone_verified_at` (with indexes/uniques) |
| `2026_11_02_080100_create_otp_verifications_table` | OTP records |
| `2026_11_02_080200_drop_duplicate_tritrack_users_table` | drops the empty duplicate account table (reversible) |

See `docs/database-design.md` for the full schema and the plan for later modules.

## Postman testing

Import `docs/TrikeTrack.postman_collection.json`. Set `baseUrl` (default
`http://127.0.0.1:8000/api`) and run the requests in order:

1. **Health** → `200 success`
2. **Register** → `201`, `verification.expires_at` returned, no code in the body
3. Read the code: with `SMS_DRIVER=log`, `grep "verification code" storage/logs/laravel.log`
   (with Semaphore, read it from the phone)
4. **Verify OTP** → `200`, `phone_verified: true`
5. **Login** → `200`; the collection script stores the token in `{{token}}`
6. **Me** → `200` with the account
7. **Logout** → `200`, token revoked

### Results observed during implementation (curl, real MySQL)

| Case | Result |
| --- | --- |
| Register new franchisee | `201`, masked number, expiry, 0 code leakage |
| Wrong OTP | `422 otp_invalid`, `remaining_attempts` decreasing |
| Correct OTP | `200`, `phone_verified_at` set, status still `pending` |
| Reusing the same OTP | `409 already_verified` / `otp_used` |
| Verify without a registration | `422 otp_user_not_found` |
| Duplicate mobile number | `422` on `mobile_number` |
| Login before verification | `403 phone_unverified` |
| Resend within cooldown | `429 otp_cooldown` with `retry_after` |
| 5 wrong attempts | `429 otp_attempts_exhausted` |
| Staff login (admin/BPLO/treasury) | `200` with token |
| Request without token | `401` in the standard envelope |

Not executed here: real SMS delivery through Semaphore (no API key), payment flows, and
visual browser checks of the React UI (the app builds and its dev server serves, but no
browser interaction test was run).

## Seeded staff accounts (local only)

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@tritrack.local` | `TrikeTrack@2026` |
| BPLO Personnel | `bplo@tritrack.local` | `TrikeTrack@2026` |
| Treasury Personnel | `treasury@tritrack.local` | `TrikeTrack@2026` |

Change or remove these before any real deployment.

## Frontend routes

| Route | Access | Page |
| --- | --- | --- |
| `/login` | guest | Sign in (email or mobile) |
| `/register` | guest | Franchisee registration |
| `/verify-otp` | guest | 6-digit OTP, expiry countdown, resend cooldown, change number |
| `/register/success` | guest | Next steps |
| `/app` | franchisee | Account dashboard (real API data) |
| `/staff` | bplo/treasury/administrator | Staff landing page |

---

# Next module

**Franchise records + franchisee management**: `franchisees`, `franchises`, `drivers`,
`vehicles`, assignment history, BPLO franchise/franchisee/driver pages, and linking a
verified account to its franchise record. Waiting for your confirmation before starting.
