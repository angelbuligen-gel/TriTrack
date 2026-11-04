# Module 2 — Franchise, franchisee, driver, and vehicle records

## What this module delivers

1. Franchisee profiles, franchises, drivers, vehicles, and **assignment history** tables.
2. BPLO REST endpoints with server-side validation, pagination, search, and filters.
3. Franchisee self-service endpoints that are scoped to the signed-in owner.
4. BPLO pages: Dashboard, Franchise Management (with driver/vehicle assignment and history
   tabs), Franchisee Management (with account linking), Driver Management.
5. The franchisee dashboard now shows the linked franchise, assigned drivers, and vehicles.

## Database (6 new migrations)

| Table | Purpose |
| --- | --- |
| `franchisees` | Owner profile; `user_id` is a nullable unique link to a franchisee account |
| `franchises` | Franchise number, issue/expiry dates, status, remarks |
| `drivers` | Driver identity and license details |
| `vehicles` | OR/CR, motor, chassis, plate, make/model, status |
| `franchise_drivers` | Assignment history: `assigned_from`, `assigned_until`, `is_primary`, status |
| `franchise_vehicles` | Assignment history: `assigned_from`, `assigned_until`, status |

History rules enforced in `FranchiseController`:

- Ending an assignment never deletes the row; it is marked `ended` with an `assigned_until`
  date, so past drivers and vehicles stay visible in the History tab.
- Assigning a driver or vehicle to another franchise automatically closes that record's
  active assignment on the previous franchise.
- Assigning the same driver or vehicle twice to one franchise returns `409`.

## API endpoints

### BPLO (`role:bplo,administrator`)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/bplo/franchisees` | Paginated list (`q`, `page`, `per_page`) |
| POST | `/api/bplo/franchisees` | Create profile |
| GET | `/api/bplo/franchisees/{id}` | Profile with franchises and assignments |
| PUT | `/api/bplo/franchisees/{id}` | Update profile |
| GET | `/api/bplo/franchisee-accounts` | Franchisee accounts with no linked profile |
| POST | `/api/bplo/franchisees/{id}/link-account` | Link an account (`user_id`) |
| DELETE | `/api/bplo/franchisees/{id}/link-account` | Unlink the account |
| GET | `/api/bplo/franchises` | Paginated list (`q`, `status`, `franchisee_id`) |
| POST | `/api/bplo/franchises` | Create franchise |
| GET | `/api/bplo/franchises/{id}` | Detail with drivers, vehicles, and history |
| PUT | `/api/bplo/franchises/{id}` | Update franchise |
| POST | `/api/bplo/franchises/{id}/drivers` | Assign driver |
| DELETE | `/api/bplo/franchises/{id}/drivers/{assignment}` | End driver assignment |
| POST | `/api/bplo/franchises/{id}/vehicles` | Assign vehicle |
| DELETE | `/api/bplo/franchises/{id}/vehicles/{assignment}` | End vehicle assignment |
| GET/POST/PUT | `/api/bplo/drivers`, `/api/bplo/drivers/{id}` | Driver records |
| GET/POST/PUT | `/api/bplo/vehicles`, `/api/bplo/vehicles/{id}` | Vehicle records |

### Franchisee (`role:franchisee`, scoped to own records)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/my/profile` | Account + linked franchisee profile |
| GET | `/api/my/franchise` | Own franchises with assignments and history |
| GET | `/api/my/drivers` | Drivers on own franchises |
| GET | `/api/my/vehicles` | Vehicles on own franchises |

List responses include pagination metadata:

```json
{ "status": "success", "message": "…", "data": [], "meta": { "current_page": 1, "per_page": 10, "total": 2, "last_page": 1 } }
```

## Account linking rules

- OTP verification never links an account to a franchise record; only BPLO can do that.
- One account links to at most one franchisee profile, and vice versa. Conflicts return `409`.
- The link dialog only offers franchisee accounts that are not linked yet.

## Frontend pages

| Route | Page |
| --- | --- |
| `/bplo` | Dashboard: totals, franchises for renewal, unlinked profiles, expired licenses, recent records |
| `/bplo/franchises` | Franchise table with search/status filter; detail modal with Overview, Drivers, Vehicles, History tabs |
| `/bplo/franchisees` | Franchisee table, create/edit, link and unlink accounts |
| `/bplo/drivers` | Driver table with license status, create/edit |
| `/app` | Franchisee dashboard with own franchise, drivers, and vehicles |

Vehicle records are managed inside Franchise Management (no separate Vehicle main-nav page),
as required by the specification. The six remaining BPLO navigation pages (Renewal, Transfer,
Change Motor, Document Review, Certificate, Reports) are listed under “Next modules” in the
sidebar and will become real pages with their own modules.

## Verification performed

Against a real MySQL database, with curl:

| Case | Result |
| --- | --- |
| BPLO lists franchisees/franchises/drivers/vehicles | `200` with pagination meta |
| Franchise detail | Includes franchisee, active drivers, vehicles, and history |
| Franchisee account sees own franchise/drivers/vehicles | `200`, only own records |
| Franchisee calls `/api/bplo/*` | `403` |
| BPLO calls `/api/my/*` | `403` |
| Create driver / vehicle | `201` |
| Assign driver and vehicle | `201` |
| Duplicate assignment | `409` |
| End assignment | Row kept, `assignment_status: ended`, `assigned_until` set |
| Reassign driver to another franchise | Previous active assignment closed automatically |
| Unlinked franchisee accounts endpoint | `200` with pending accounts |

Frontend: `npm run lint` (0 warnings, 0 errors) and `npm run build` pass. No browser
interaction test was run.

## Seeded sample data

`php artisan db:seed` also creates:

- Marites Santos (`marites.santos@example.com` / `Passw0rd123`), verified, active, with
  franchise `OM-2026-0001`, two drivers, two vehicles.
- Roberto Reyes, a franchisee profile with **no** linked account and franchise
  `OM-2024-0117` flagged `for_renewal`, for testing the linking workflow.

---

# Next module

**Franchise renewal management**: renewal applications, document upload with preserved
submission history, BPLO review and processing, and fee assessment hand-off to Treasury.
