# TrikeTrack — Public Transport Franchise Processing System

A web-based franchise processing system for a Local Government Office in Oriental Mindoro.

- **Backend:** Laravel 13 REST API on PHP 8.4, MySQL, Laravel Sanctum
- **Frontend:** separate React 19 + Vite application (`TrikeTrack-Frontend/`)
- **ML service:** separate Python/FastAPI document extraction service (`ml-service/`)

## Status

| Module | State |
| --- | --- |
| Project setup, database, authentication API | Done |
| Franchisee registration with SMS OTP verification | Done |
| React auth screens (register, OTP, login, dashboards) | Done |
| Franchise / franchisee / driver / vehicle records | Done |
| Franchise renewal applications + BPLO review | Done |
| Document upload with permanent submission history | Done |
| Transfer, change motor applications | Planned (schema and workflow already support them) |
| ML extraction of uploaded documents | Planned |
| Fee assessment, online payments, treasury verification | Planned |
| Certificate generation, reports, administration | Planned |

Details: [`docs/module-01-auth-and-otp.md`](docs/module-01-auth-and-otp.md),
[`docs/module-02-franchise-records.md`](docs/module-02-franchise-records.md),
[`docs/module-03-renewal-applications.md`](docs/module-03-renewal-applications.md),
[`docs/database-design.md`](docs/database-design.md).

## Requirements

- PHP 8.4 (a project-local copy is already installed at `.tools/php`)
- Composer
- MySQL (XAMPP) with database `tritrack_db`
- Node.js 20+

The system PHP on this machine is 8.1 inside XAMPP, which Laravel 13 rejects. Use the
bundled 8.4 binary for every backend command:

```sh
.tools/php/php.exe -v
```

## Running the backend

```sh
cd C:\xampp\htdocs\TriTrack

.tools/php/php.exe artisan migrate
.tools/php/php.exe artisan db:seed
.tools/php/php.exe artisan serve --host=127.0.0.1 --port=8000
```

API base URL: `http://127.0.0.1:8000/api`

## Running the frontend

```sh
cd C:\xampp\htdocs\TriTrack\TrikeTrack-Frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Environment keys added

```dotenv
APP_NAME=TrikeTrack
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# log = print OTP to storage/logs/laravel.log (development only)
# semaphore = real Philippine SMS gateway
SMS_DRIVER=log
SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=TrikeTrack

OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_SENDS_PER_HOUR=5
```

Never commit real gateway credentials; they live only in the Laravel `.env` and are never
sent to the React application.

## Sample records

`php artisan db:seed` also creates Marites Santos (`marites.santos@example.com` /
`Passw0rd123`, franchise `OM-2026-0001` with drivers and vehicles) and an unlinked
franchisee profile for testing BPLO account linking.

## Local staff accounts

Seeded by `php artisan db:seed` — replace before deploying.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@tritrack.local` | `TrikeTrack@2026` |
| BPLO Personnel | `bplo@tritrack.local` | `TrikeTrack@2026` |
| Treasury Personnel | `treasury@tritrack.local` | `TrikeTrack@2026` |

## Project structure

```
TriTrack/                    Laravel REST API
├── app/                     controllers, models, services, requests, resources
├── database/                migrations, seeders, factories
├── docs/                    design notes and Postman collection
├── ml-service/              Python document extraction service
├── routes/api.php           API routes
├── TrikeTrack-Frontend/     React + Vite application
└── .tools/php/              project-local PHP 8.4 (git-ignored)
```
