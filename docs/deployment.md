# Deployment Guide

## Local

```bash
cp .env.example .env
docker compose up --build
```

## Production Notes

- Use managed PostgreSQL.
- Use managed Redis for rate limiting, OTP throttling, and background jobs.
- Put Nginx or a cloud load balancer in front of frontend/backend services.
- Terminate HTTPS before traffic reaches app containers.
- Set strict `CORS_ALLOWED_ORIGINS`.
- Rotate `DJANGO_SECRET_KEY`.
- Configure SMS provider credentials before enabling real OTP sends.

