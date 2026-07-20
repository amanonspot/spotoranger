#!/usr/bin/env bash
# Min-cost Spoto Ranger bootstrap for a single Ubuntu EC2.
# Usage (as root):  sudo bash deploy/bootstrap-ec2.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/spotoranger}"
APP_USER="${APP_USER:-ubuntu}"
SWAP_MB="${SWAP_MB:-2048}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/bootstrap-ec2.sh"
  exit 1
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "Missing ${APP_DIR}/.env — copy .env.example and fill values first."
  exit 1
fi

if [[ ! -d "${APP_DIR}/backend" || ! -d "${APP_DIR}/frontend" ]]; then
  echo "Expected backend/ and frontend/ under ${APP_DIR}"
  exit 1
fi

# shellcheck disable=SC1091
set -a
# strip CR for Windows-edited .env files
tmp_env="$(mktemp)"
tr -d '\r' < "${APP_DIR}/.env" > "${tmp_env}"
# shellcheck disable=SC1090
source "${tmp_env}"
rm -f "${tmp_env}"
set +a

: "${POSTGRES_DB:=spoto_ranger}"
: "${POSTGRES_USER:=spoto}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}"
: "${DJANGO_SECRET_KEY:?DJANGO_SECRET_KEY must be set in .env}"
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"

PUBLIC_IP="$(curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/public-ipv4 || true)"
if [[ -z "${PUBLIC_IP}" ]]; then
  PUBLIC_IP="$(curl -s --connect-timeout 2 https://checkip.amazonaws.com || true)"
fi
PUBLIC_IP="$(echo "${PUBLIC_IP}" | tr -d '[:space:]')"

echo "==> Public IP detected: ${PUBLIC_IP:-unknown}"

# --- swap (helps t3.micro / 1GB RAM survive Next build) ---
if [[ ! -f /swapfile ]]; then
  echo "==> Creating ${SWAP_MB}MB swap"
  fallocate -l "${SWAP_MB}M" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count="${SWAP_MB}"
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

export DEBIAN_FRONTEND=noninteractive
echo "==> Installing system packages"
apt-get update -y
apt-get install -y \
  curl ca-certificates gnupg \
  nginx postgresql postgresql-contrib \
  python3 python3-venv python3-pip \
  build-essential git

# Node 22
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Node $(node -v) / npm $(npm -v)"

# --- Postgres ---
echo "==> Ensuring PostgreSQL role + database"
systemctl enable --now postgresql

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    CREATE ROLE ${POSTGRES_USER} LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  ELSE
    ALTER ROLE ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};
SQL

# --- permissions ---
id -u "${APP_USER}" >/dev/null 2>&1 || useradd -m -s /bin/bash "${APP_USER}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# --- Backend ---
echo "==> Backend venv + migrate"
sudo -u "${APP_USER}" bash <<EOF
set -euo pipefail
cd "${APP_DIR}/backend"
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate --noinput
EOF

# --- Frontend (needs NEXT_PUBLIC_* at build time) ---
echo "==> Frontend install + build"
if [[ -n "${PUBLIC_IP}" ]]; then
  # Helpful if .env still has placeholders
  if grep -q 'YOUR_PUBLIC_IP' "${APP_DIR}/.env" 2>/dev/null; then
    sed -i "s/YOUR_PUBLIC_IP/${PUBLIC_IP}/g" "${APP_DIR}/.env"
    echo "Replaced YOUR_PUBLIC_IP in .env with ${PUBLIC_IP}"
  fi
fi

# Re-source after possible sed
set -a
tmp_env="$(mktemp)"
tr -d '\r' < "${APP_DIR}/.env" > "${tmp_env}"
# shellcheck disable=SC1090
source "${tmp_env}"
rm -f "${tmp_env}"
set +a

if [[ -z "${NEXT_PUBLIC_API_BASE_URL:-}" || "${NEXT_PUBLIC_API_BASE_URL}" == *"YOUR_PUBLIC_IP"* ]]; then
  if [[ -n "${PUBLIC_IP}" ]]; then
    export NEXT_PUBLIC_API_BASE_URL="http://${PUBLIC_IP}/api"
    if grep -q '^NEXT_PUBLIC_API_BASE_URL=' "${APP_DIR}/.env"; then
      sed -i "s|^NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}|" "${APP_DIR}/.env"
    else
      echo "NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}" >> "${APP_DIR}/.env"
    fi
  else
    echo "WARNING: NEXT_PUBLIC_API_BASE_URL not set and public IP unknown"
  fi
fi

sudo -u "${APP_USER}" bash <<EOF
set -euo pipefail
cd "${APP_DIR}/frontend"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}"
npm ci
npm run build
EOF

# --- systemd (1 worker for micro instances) ---
echo "==> Installing systemd units"
cat > /etc/systemd/system/spoto-ranger-api.service <<UNIT
[Unit]
Description=Spoto Ranger API (FastAPI / Uvicorn)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/backend/.venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/spoto-ranger-web.service <<UNIT
[Unit]
Description=Spoto Ranger Web (Next.js)
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/frontend
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now spoto-ranger-api spoto-ranger-web

# --- Nginx IP mode ---
echo "==> Configuring Nginx (single-IP /api proxy)"
cp "${APP_DIR}/deploy/nginx/spoto-ranger-ip.conf" /etc/nginx/sites-available/spoto-ranger
rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/spoto-ranger /etc/nginx/sites-enabled/spoto-ranger
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "============================================"
echo " Spoto Ranger is up (min-cost single EC2)"
echo " Website:  http://${PUBLIC_IP:-YOUR_IP}"
echo " API docs: http://${PUBLIC_IP:-YOUR_IP}/api/docs"
echo " Health:   http://${PUBLIC_IP:-YOUR_IP}/api/health"
echo "============================================"
echo "Check: sudo systemctl status spoto-ranger-api spoto-ranger-web nginx"
