# Spoto Ranger Platform

Mobile-first property lead submission, review, and wallet rewards for Spoto Rangers.

**Database: PostgreSQL only** (SQLite is not supported).

## Monorepo layout

| Path | Role | Local port |
|------|------|------------|
| `frontend/` | Ranger PWA (Next.js 15) | `3000` |
| `admin/` | Admin console (Next.js 15) | `3001` |
| `backend/` | Django domain + FastAPI REST | `8000` |
| `deploy/` | EC2 bootstrap, Nginx, systemd | — |
| `docs/` | Product, architecture, API, deploy | — |

Env strategy:

- Root `.env` — backend secrets + EC2 deploy (see `.env.example`)
- `frontend/.env.local` — Ranger `NEXT_PUBLIC_*` (see `frontend/.env.example`)
- `admin/.env` — Admin `NEXT_PUBLIC_*` (see `admin/.env.example`)

## Local development

```bash
# 1) Root env for API
cp .env.example .env
# set DATABASE_URL, DJANGO_SECRET_KEY, SMS keys…

# 2) API
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
uvicorn api.main:app --reload --port 8000

# 3) Ranger PWA
cd frontend
cp .env.example .env.local
npm ci && npm run dev

# 4) Admin console
cd admin
cp .env.example .env
npm ci && npm run dev
```

| App | URL |
|-----|-----|
| Ranger | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API docs | http://localhost:8000/docs |

## Min-cost AWS deploy

One `t3.micro` EC2 runs Nginx + Ranger + Admin + API + Postgres (~$0–10/mo).  
No RDS, Redis, Docker, or load balancer. **Guide:** [docs/deployment.md](docs/deployment.md)

```bash
# On the EC2 after cloning to /opt/spotoranger:
cp .env.example .env
nano .env   # PUBLIC_IP, secrets, SMS, Postgres password
sudo bash deploy/bootstrap-ec2.sh
```

| URL | What |
|-----|------|
| `http://PUBLIC_IP` | Ranger |
| `http://PUBLIC_IP/console` | Admin |
| `http://PUBLIC_IP/api/docs` | FastAPI docs |

## Design system

Spoto purple + lime tokens live in each Next app under `src/design-system`  
(`frontend/` and `admin/` currently share the same tokens — keep them visually aligned).
