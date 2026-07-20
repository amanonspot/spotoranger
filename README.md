# Spoto Ranger Platform

Mobile-first property lead submission, review, and wallet rewards for Spoto Rangers.

**Database: PostgreSQL only** (SQLite is not supported).

## Apps

- `frontend/` — Next.js 15 App Router (Ranger PWA)
- `backend/` — Django domain + FastAPI REST API
- `docs/` — Architecture, API, database, deployment
- `deploy/` — Min-cost EC2 bootstrap, Nginx, systemd

## Min-cost AWS deploy (recommended)

One `t3.micro` EC2 runs Nginx + Next + API + Postgres (~$0–10/mo).  
No RDS, Redis, Docker, or load balancer.

**Guide:** [docs/deployment.md](docs/deployment.md)

```bash
# On the EC2 after cloning to /opt/spotoranger:
cp .env.example .env
nano .env   # set PUBLIC_IP, secrets, SMS, Postgres password
sudo bash deploy/bootstrap-ec2.sh
```

Then open `http://PUBLIC_IP` and `http://PUBLIC_IP/api/docs`.

## Design system

Use `frontend/src/design-system` only — Spoto purple + lime tokens.
