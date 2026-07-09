# Spoto Ranger Platform — Developer Documentation

> A field-worker rewards platform: delivery **Rangers** submit rental property leads from a mobile PWA; an **Admin** reviews and verifies them from a dashboard; when a lead is published live, a reward is credited to the Ranger's wallet. Everything is backed by one shared API.

This document is for the dev team. It covers the **three surfaces** (Ranger web app, Admin console, Backend), how they connect, how to run them locally, the API, the data model, business rules, and deployment.

---

## Table of contents
1. [System overview](#1-system-overview)
2. [Repositories & branches](#2-repositories--branches)
3. [Tech stack](#3-tech-stack)
4. [Local development quickstart](#4-local-development-quickstart)
5. [Backend](#5-backend)
6. [Ranger web app](#6-ranger-web-app)
7. [Admin console](#7-admin-console)
8. [Design system (shared, vendored)](#8-design-system-shared-vendored)
9. [Business rules & flows](#9-business-rules--flows)
10. [API reference](#10-api-reference)
11. [Deployment](#11-deployment)
12. [Known gaps & follow-ups](#12-known-gaps--follow-ups)

---

## 1. System overview

Three surfaces, one backend, one database:

```
  ┌─────────────────────────┐        ┌─────────────────────────┐
  │   Ranger web app (PWA)   │        │     Admin console        │
  │   Next.js · :3000        │        │   Next.js · :3001        │
  │   login: phone + OTP     │        │   login: phone + OTP     │
  └───────────┬──────────────┘        └───────────┬─────────────┘
              │  REST (JSON)                       │  REST (JSON) + JWT Bearer
              └───────────────┬────────────────────┘
                              ▼
                 ┌─────────────────────────────┐
                 │   Backend API · :8000        │
                 │   FastAPI (REST) +           │
                 │   Django (models/ORM/admin)  │
                 └──────────────┬───────────────┘
                                ▼
                     ┌────────────────────┐
                     │  Database           │
                     │  Postgres (prod) /  │
                     │  SQLite (local)     │
                     └────────────────────┘
```

**The core business loop:**
1. Ranger logs in (phone + OTP) and **submits a property** lead.
2. Admin sees it in the review queue and **verifies** it (success) — or requests more info / marks duplicate / rejects.
3. Once verified, the admin **sends the reward** — this publishes the listing "live on Spoto" and credits a flat **₹100** to the Ranger's wallet.
4. The Ranger sees the **+₹100 balance** and a "Reward credited" notification in their app.

Each **submission** and each **Ranger** has a unique UUID, surfaced in the UI.

---

## 2. Repositories & branches

| Surface | GitHub repo | Local path | Default/main |
|---|---|---|---|
| Ranger app **+** Backend | `github.com/amanonspot/spotoranger` | `~/Documents/Spoto Ranger` | `main` |
| Admin console | `github.com/amanonspot/spotorangeradmin` | `~/Documents/spotorangeradmin` | `main` |

> **Note:** the Ranger frontend and the Backend live in the **same** repo (`spotoranger`, in `frontend/` and `backend/`). The Admin console is a **separate** repo that talks to the same backend.

Branches (all pushed): `spotoranger` → `main`, `feat/admin-api`, `feat/mock-ranger-spoto-rebrand` (all currently equal). `spotorangeradmin` → `main`, `feat/admin-console`.

---

## 3. Tech stack

**Backend**
- Django 5.1 — models, ORM, migrations, admin site, auth user model, business services.
- FastAPI 0.115 — the REST API layer (served by uvicorn); interactive docs at `/docs`.
- `python-jose` (JWT), `passlib` (hashing available), `dj-database-url`, `django-cors-headers`.
- DB: PostgreSQL in prod, SQLite locally by default.

**Frontends (both apps)**
- Next.js 15 (App Router, RSC) · React 19 · TypeScript.
- Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`) · shadcn (new-york) primitives.
- `lucide-react` icons · `react-hot-toast` · `class-variance-authority` · `clsx` + `tailwind-merge`.
- Fonts: **Montserrat** (headings/buttons) + **Open Sans** (body). Dark theme, brand colors **purple `#AF7AEB`** + **lime `#B7F041`**.

---

## 4. Local development quickstart

Run all three processes (three terminals). **Start the backend first.**

**1) Backend — `~/Documents/Spoto Ranger/backend`**
```bash
python -m venv .venv && source .venv/bin/activate   # first time
pip install -r requirements.txt                      # first time
python manage.py migrate
python manage.py seed_dev          # seeds demo data + accounts (idempotent)
ENVIRONMENT=local OTP_DEV_CODE=0000 uvicorn api.main:app --reload --port 8000
```

**2) Ranger app — `~/Documents/Spoto Ranger/frontend`**
```bash
npm install        # first time
npm run dev         # http://localhost:3000
```

**3) Admin console — `~/Documents/spotorangeradmin`**
```bash
npm install        # first time
npm run dev         # http://localhost:3001 (port is set in package.json)
```

### URLs & demo logins (development)
| What | URL | Login |
|---|---|---|
| Ranger web app | http://localhost:3000 | phone `9999999999` · OTP `0000` |
| Admin console | http://localhost:3001 | phone `8888888888` · OTP `0000` |
| API (interactive Swagger) | http://localhost:8000/docs | — |
| Django admin site | http://localhost:8001/admin (or `manage.py runserver`) | superuser `admin` |

> **OTP `0000`** is a dev-only bypass, gated to non-production environments (`ENVIRONMENT != "production"`). It is **not** production auth.

---

## 5. Backend

Path: `~/Documents/Spoto Ranger/backend`. Django owns the domain (models/DB/services); FastAPI exposes the REST API.

### Layout
```
backend/
  manage.py
  config/            # Django project: settings.py, urls.py, asgi/wsgi
  apps/core/
    models.py        # all domain models
    admin.py         # Django admin registrations
    services/        # business logic (see below)
      property_service.py     # status transitions (validated) + history + notify
      wallet_service.py       # ledger ops: send_reward, recompute_from_ledger
      spoto_listing_service.py# stub seam for Spoto's real "go live" integration
    management/commands/seed_dev.py   # local seed data
    tests.py
  api/               # FastAPI layer
    main.py          # app + CORS + router registration + django.setup()
    security.py      # JWT: create_access_token, get_current_user, require_admin
    routers/
      health.py auth.py properties.py wallet.py training.py
      notifications.py ranger.py admin.py
  requirements.txt
  Dockerfile
```

### Data model (key models in `apps/core/models.py`)
All primary keys are **UUID**s. `created_at` / `updated_at` on everything; soft-delete via `deleted_at` where relevant.

| Model | Purpose | Key fields |
|---|---|---|
| **User** (custom `AUTH_USER_MODEL`) | Account | `phone` (unique), `full_name`, `role` (`ranger`/`recruiter`/`admin`), `is_phone_verified` |
| **RangerProfile** | Ranger details | 1:1 `user`, `delivery_platform`, `preferred_area`, `upi_id`, `is_active_ranger`; FK `recruiter` |
| **RecruiterProfile** | Recruiter | 1:1 `user`, `invite_code` |
| **OtpSession** | OTP challenge | `phone`, `code_hash`, `expires_at`, `verified_at` |
| **Property** | A submitted lead | FK `ranger`, `building_name`, `area`, owner fields, `bhk`, `monthly_rent`, `deposit`, `status`, `reward_amount` |
| **PropertyStatusHistory** | Audit timeline | FK `property`, `from_status`, `to_status`, `reason`, `suggestion`, `changed_by` |
| **Wallet** | Ranger wallet | 1:1 `ranger`, `current_balance`, `lifetime_earnings`, `pending_rewards`, `withdrawn_amount` |
| **WalletTransaction** | Append-only ledger | FK `wallet`, `transaction_type` (`credit`/`debit`/`hold`/`release`), `amount`, `balance_after`, FK `property` |
| **Withdrawal** | Payout request | FK `wallet`, `amount`, `status`, `upi_id` |
| **Notification** | In-app notice | FK `user`, `title`, `body`, `read_at`, `action_url` |
| **TrainingArticle** | Learn content | `title`, `slug`, `summary`, `body`, `is_published` |
| **Invitation** | Recruit a ranger | FK `recruiter`, `phone`, `token`, `status`, `expires_at` |
| **AuditLog** | System audit | `actor`, `action`, `entity_type`, `entity_id`, `metadata` |

**`PropertyStatus`** values: `submitted` → `under_review` → `verified` / `need_more_information` / `duplicate` / `rejected` → `listed_on_spoto` → `reward_credited`.

### Services layer (`apps/core/services/`)
Business logic lives here (not in routers), so both the API and admin commands share it.
- **`property_service.change_status(prop, to_status, admin, reason, suggestion)`** — validates the transition against an allow-list, writes `PropertyStatusHistory` + `AuditLog` + a Ranger `Notification`. Raises `TransitionError` on an illegal move.
- **`wallet_service.send_reward(prop, admin)`** — the reward step. Requires the property to be **`verified`** first (else `TransitionError` → HTTP 409). Atomically: publishes live (`listed_on_spoto`) → credits a **flat ₹100** (`REWARD_AMOUNT`) `WalletTransaction` → sets `reward_credited` → notifies the Ranger. **Idempotent** (a second call never double-pays).
- **`wallet_service.recompute_from_ledger(wallet)`** — rebuilds wallet totals + each row's `balance_after` from the ledger (used by demo reset).
- **`spoto_listing_service.publish_listing(prop)`** — stub returning a fake listing ref. **Swap this for the real Spoto main-backend call** when available; the admin publish flow already treats a failure here as a hard stop.

### Auth
- **OTP**: `POST /auth/otp/request` creates an `OtpSession`; `POST /auth/otp/verify` checks the code (or the dev bypass `0000` in non-prod), marks the user phone-verified, and returns the profile **plus a JWT** (`token`).
- **JWT** (`api/security.py`): HS256, signed with `DJANGO_SECRET_KEY`, 7-day expiry, claims `sub`/`role`/`phone`. `get_current_user` decodes the `Authorization: Bearer` header; `require_admin` is a FastAPI dependency that 403s anyone whose `role != admin`.
- **All `/admin/*` endpoints require an admin JWT.** The Ranger-facing endpoints are currently open (see [gaps](#12-known-gaps--follow-ups)).

### Environment variables (`.env`, see `.env.example`)
| Var | Purpose | Local default |
|---|---|---|
| `ENVIRONMENT` | Gates the `0000` OTP bypass | `local` |
| `OTP_DEV_CODE` | Dev OTP value | `0000` |
| `DJANGO_SECRET_KEY` | Django + JWT signing secret | `change-me` |
| `DJANGO_DEBUG` | Debug mode | `true` |
| `DJANGO_ALLOWED_HOSTS` | Allowed hosts | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Comma-list of allowed frontends | `http://localhost:3000,http://localhost:3001` |
| `DATABASE_URL` | DB connection (dj-database-url) | sqlite fallback |
| `NEXT_PUBLIC_API_BASE_URL` | (frontends) backend base URL | `http://localhost:8000` |

### Tests
```bash
python manage.py test
```
Covers: admin auth gating (401 no token / 403 non-admin), status-transition validation, reward-before-verify rejection, flat-₹100 idempotent credit, and ledger recompute.

---

## 6. Ranger web app

Path: `~/Documents/Spoto Ranger/frontend`. A mobile-first PWA; responsive up to desktop.

### Layout
```
frontend/src/
  app/
    layout.tsx  globals.css        # dark theme + design tokens (@theme)
    page.tsx                       # / home (protected)
    onboarding/page.tsx            # phone + OTP login
    leads/page.tsx  leads/[id]/    # my leads + lead detail (status timeline)
    wallet/page.tsx                # balance + transactions + withdraw (stub)
    profile/page.tsx               # ranger info + notifications + logout
    submit/page.tsx                # submit a property (form)
  components/
    app-shell/                     # AppShell, SideNav (desktop), bottom-nav (mobile), RequireAuth
    leads/lead-card.tsx
    ui/button.tsx  revamp/*  Logo.tsx   # vendored design-system pieces
  design-system/components/        # Button, Card, Input, Chip, StatusBadge
  lib/
    api/client.ts  api/ranger.ts   # fetch wrapper + typed calls
    auth/session.ts                # localStorage session + useSession hook
    utils.ts  format.ts
```

### Auth / session
- Client-side **mock session** stored in `localStorage` (`spoto-ranger-session`), holding the profile returned by `/auth/otp/verify`. `RequireAuth` redirects to `/onboarding` when absent. (This is a dev convenience, not production security — see [gaps](#12-known-gaps--follow-ups).)
- API calls go through `lib/api/client.ts` → `lib/api/ranger.ts` (typed helpers: `requestOtp`, `verifyOtp`, `getWallet`, `listLeads`, `getLead`, `getNotifications`, `getRangerProfile`).

### Responsive model
- One `AppShell` wraps every screen: **mobile** = centered column + fixed bottom tab bar; **desktop (`lg+`)** = left sidebar + widened multi-column content. Breakpoint: Tailwind `lg` (1024px).

### Run / env
`npm run dev` (:3000). Set `NEXT_PUBLIC_API_BASE_URL` (`.env.local`) to point at the backend.

---

## 7. Admin console

Path: `~/Documents/spotorangeradmin`. A separate repo; **vendors a copy** of the same design system so it's self-contained and looks identical.

### Layout
```
spotorangeradmin/src/
  app/
    layout.tsx  globals.css
    login/page.tsx                 # phone + OTP (must resolve to role=admin)
    page.tsx                       # / dashboard (stat cards + recent + demo banner)
    submissions/page.tsx           # queue: filters + search, table↔cards
    submissions/[id]/page.tsx      # detail: timeline + TWO-STEP action panel
    rangers/page.tsx  rangers/[id] # rangers list + detail (+ invite)
  components/
    admin-shell/                   # AdminShell, SideNav, mobile nav, RequireAdmin,
                                   # StatCard, SubmissionsTable, ConfirmModal
    ui/button.tsx  revamp/*  Logo.tsx
  design-system/components/        # vendored copy (keep in sync w/ ranger app)
  lib/
    api/client.ts                  # attaches Authorization: Bearer <jwt>
    api/admin.ts                   # typed admin calls
    auth/session.ts                # stores { token, user }; RequireAdmin needs role=admin
```

### Auth
- Login uses the same OTP endpoints; on verify the app **requires `role === "admin"`** (else shows "not an admin account") and stores `{ token, user }`. `lib/api/client.ts` sends the JWT as a **Bearer** header on every call; `RequireAdmin` redirects to `/login` without a valid admin session.

### The two-step review flow (submission detail)
The action panel is an explicit stepper:
1. **Step 1 · Verify** — enabled while the submission is `submitted` / `under_review` / `need_more_information`. Shows ✓ Done once verified.
2. **Step 2 · Send Reward (₹100)** — **disabled until the submission is verified**, then activates. Confirming credits ₹100 to the Ranger and marks it `reward_credited`.
3. Secondary outcomes: **Request more info**, **Mark duplicate**, **Reject (failed)**.

### Demo listing (admin training)
A seeded **"Demo Listing — Practice"** submission lets an admin rehearse the flow safely:
- Dashboard shows a **"Try the demo listing"** banner; the demo detail shows a tutorial callout.
- **Reset demo** (`POST /admin/demo/reset`) returns it to `submitted` and undoes the practice reward (via ledger recompute), so it can be run repeatedly.

### Run / env
`npm run dev` (:3001). Set `NEXT_PUBLIC_API_BASE_URL`. The backend must include the admin origin in `CORS_ALLOWED_ORIGINS`.

---

## 8. Design system (shared, vendored)

The brand system is the dark Spoto theme (purple `#AF7AEB` + lime `#B7F041`, Montserrat/Open Sans, `rounded-xl`), adapted from `github.com/amanonspot/Spotowebapp`.

- **Tokens** live in each app's `src/app/globals.css` under `@theme` (Tailwind v4), plus brand effect classes (`.btn-shimmer`, `.spoto-logo-glow`).
- **Primitives**: `Button` (cva `buttonVariants`), `Card`, `Input`/`Select`/`Textarea`, `Chip`, `StatusBadge`, `Logo`.
- ⚠️ **The design system is duplicated (copied) into both frontends by design** — the two repos are intentionally separate. If you change a shared component or token, **apply the change in both** `frontend/` and `spotorangeradmin/`. (If this becomes painful, the future option is extracting a published `@spoto/ui` package.)

---

## 9. Business rules & flows

**Property status lifecycle**
```
submitted → under_review → verified ──► listed_on_spoto ──► reward_credited
                    │           │
                    ├──► need_more_information (can return to review/verify)
                    ├──► duplicate  (terminal)
                    └──► rejected   (terminal)
```
Transitions are enforced server-side in `property_service` (illegal moves → HTTP 409).

**Reward rules**
- Flat **₹100** per rewarded listing (`wallet_service.REWARD_AMOUNT`).
- Reward is only possible **after** `verified` (enforced server-side; the admin button is also disabled until then).
- **Idempotent** — a listing already `reward_credited` cannot be paid again.
- Wallet balances are always **derived from the append-only `WalletTransaction` ledger**; never mutate a balance directly outside the wallet service.

**Notifications** — the Ranger is notified on: verified, listed on Spoto, reward credited, more-info-needed, duplicate, rejected. The Ranger app reads them on the profile screen and reflects the wallet on load.

---

## 10. API reference

Base URL: `http://localhost:8000`. Interactive, always-current spec: **`/docs`** (Swagger) and `/openapi.json`. All bodies are JSON.

### Public / auth
| Method | Path | Body / Query | Notes |
|---|---|---|---|
| GET | `/health` | — | `{ "status": "ok" }` |
| POST | `/auth/otp/request` | `{ phone }` | Creates an OTP session |
| POST | `/auth/otp/verify` | `{ phone, code }` | → `{ status, user{ id, fullName, phone, role, rangerId }, token }` |

### Ranger-facing (currently unauthenticated)
| Method | Path | Purpose |
|---|---|---|
| GET | `/properties?ranger_id=&status=` | List a ranger's leads |
| GET | `/properties/{id}` | Lead detail + `statusHistory` |
| GET | `/wallet/{ranger_id}` | Balances + transactions |
| GET | `/notifications?user_id=` | A user's notifications |
| GET | `/ranger/{ranger_id}` | Ranger profile |
| GET | `/training` | Published training articles |

### Admin (require `Authorization: Bearer <admin JWT>`)
| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/admin/stats` | — | Dashboard counters (pending, verified, listed, rewards paid, active rangers) |
| GET | `/admin/submissions?status=&ranger_id=&search=` | — | Review queue |
| GET | `/admin/submissions/{id}` | — | Full detail + `statusHistory` |
| POST | `/admin/submissions/{id}/status` | `{ status, reason?, suggestion? }` | Verify / need-info / duplicate / reject |
| POST | `/admin/submissions/{id}/reward` | — | **Send ₹100 reward** (409 if not yet verified) |
| GET | `/admin/rangers` · `/admin/rangers/{id}` | — | Rangers list / detail |
| POST | `/admin/rangers/invite` | `{ phone }` | Create an invitation |
| GET | `/admin/demo` | — | Get the demo listing id |
| POST | `/admin/demo/reset` | — | Reset the demo listing + undo its reward |

**Example — admin login → send reward**
```bash
# 1) get an admin token
TOKEN=$(curl -s -X POST localhost:8000/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"phone":"8888888888","code":"0000"}' | jq -r .token)

# 2) verify a submission, then reward it
curl -X POST localhost:8000/admin/submissions/<ID>/status \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"verified"}'

curl -X POST localhost:8000/admin/submissions/<ID>/reward \
  -H "Authorization: Bearer $TOKEN"     # → status reward_credited, +₹100 to ranger wallet
```

---

## 11. Deployment

Recommended split (Vercel/Netlify can host the Next.js frontends but **not** the Django/Postgres backend):

| Component | Host | Notes |
|---|---|---|
| Ranger app (`frontend/`) | Vercel | Set root dir `frontend/`, env `NEXT_PUBLIC_API_BASE_URL` = deployed backend URL |
| Admin console (`spotorangeradmin`) | Vercel | Env `NEXT_PUBLIC_API_BASE_URL` = deployed backend URL |
| Backend (`backend/`) | Render / Railway / Fly | Deploy the `Dockerfile`; add managed **Postgres**; run `migrate` + `seed_dev` on release |
| Database | Managed Postgres | `DATABASE_URL` |

**Wiring:** set each frontend's `NEXT_PUBLIC_API_BASE_URL` to the backend URL, and add both frontend domains to the backend's `CORS_ALLOWED_ORIGINS`. Set a strong `DJANGO_SECRET_KEY` and `ENVIRONMENT=production` (which disables the `0000` OTP bypass). Local ports: backend `8000`, ranger `3000`, admin `3001`.

**Mobile note:** native mobile clients (e.g. a future Flutter app) aren't subject to CORS, but need the correct base URL — Android emulator uses `http://10.0.2.2:8000`, a physical device needs the LAN IP or the deployed URL.

---

## 12. Known gaps & follow-ups

- **Ranger-facing endpoints are currently open** (no token). JWT issuance already exists on `verify`; the follow-up is to protect `/properties`, `/wallet`, `/ranger`, `/notifications` with the Ranger's token and scope them to the owner.
- **Mock session on the Ranger app** is `localStorage`-based (dev convenience). Production should use the JWT + proper session handling.
- **"Live on Spoto" is stubbed** (`spoto_listing_service`) — plug in the real Spoto main-backend integration there.
- **Design system is duplicated** across the two frontends — keep changes in sync (or extract a shared package later).
- **Reward is a flat ₹100** — make configurable if variable rewards are needed.
- **Withdrawals** are modeled (`Withdrawal`) and the Ranger has a "Withdraw" button, but the payout flow is a stub.

---

*Generated for the Spoto dev team. Demo logins — Ranger `9999999999`/`0000`, Admin `8888888888`/`0000`. Interactive API: `http://localhost:8000/docs`.*
