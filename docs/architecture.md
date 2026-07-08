# Architecture

## Boundary

The platform is split into two independently owned applications:

- `frontend/` - Next.js PWA. It talks to the platform only through REST APIs.
- `backend/` - Django domain core and FastAPI REST surface.

The frontend never imports backend code and never connects directly to PostgreSQL.

## Backend Shape

Django owns:

- Database models and migrations
- Django Admin
- Authentication state
- RBAC
- Wallet ledger
- Admin/recruiter business operations
- Audit logs

FastAPI owns:

- Public REST API routing
- OpenAPI docs
- Ranger, recruiter, admin, notification, maps, and future AI endpoints

FastAPI initializes Django and uses the Django ORM through service modules. API routers should stay thin; business rules belong in service modules under `backend/apps/core/services/`.

## Frontend Shape

The frontend is feature-oriented and design-system constrained:

- `src/design-system` - Spoto tokens and reusable primitives
- `src/components` - app-shell and shared product components
- `src/app` - route-level composition
- `src/lib/api` - REST client

Do not define one-off visual styles in feature code when a design-system primitive exists.

