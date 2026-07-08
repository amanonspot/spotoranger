# Spoto Ranger Platform

Production-ready MVP for Spoto Rangers: a mobile-first property lead submission, review, recruiter, and wallet platform.

## Apps

- `frontend/` - Next.js 15 App Router PWA. Uses Spoto design-system tokens and REST APIs only.
- `backend/` - Django domain core plus FastAPI REST layer backed by PostgreSQL.
- `docs/` - Architecture, API, database, deployment, and product documentation.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Local URLs:

- Frontend: http://localhost:3000
- FastAPI docs: http://localhost:8000/docs
- Django admin: http://localhost:8001/admin

## Local Data Setup

Seed the local database (idempotent) with the admin user, training articles, and the
mock Ranger account with wallet, leads, status history, and notifications:

```bash
cd backend
python manage.py migrate
python manage.py seed_dev
```

## Mock Login (development only)

The onboarding flow accepts any valid 10-digit number; use the seeded demo Ranger for a
fully populated experience:

- **Phone:** `9999999999`
- **OTP:** `0000`

The `0000` code is a development-only bypass (gated to non-production environments) and is
**not** production authentication.

## Design System Rule

All frontend screens use the Spoto design system in `frontend/src/design-system` — the
dark purple + lime-green brand from [Spotowebapp](https://github.com/amanonspot/Spotowebapp),
built on Tailwind v4 + shadcn (new-york), Montserrat headings, and Open Sans body. Do not add
one-off colors, radii, shadows, buttons, inputs, or navigation patterns directly inside feature
code. The UI is responsive: a single-column app with a bottom tab bar on phones, and a
sidebar dashboard layout on laptops.

