#!/usr/bin/env bash
# Min-cost Spoto Ranger bootstrap for a single Ubuntu EC2.
# Installs: Postgres + API + Ranger web + Admin console + Nginx
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

if [[ ! -d "${APP_DIR}/backend" || ! -d "${APP_DIR}/frontend" || ! -d "${APP_DIR}/admin" ]]; then
  echo "Expected backend/, frontend/, and admin/ under ${APP_DIR}"
  exit 1
fi

load_dotenv() {
  local file="$1"
  local tmp_env
  tmp_env="$(mktemp)"
  tr -d '\r' < "${file}" > "${tmp_env}"
  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(echo "${key}" | tr -d '[:space:]')"
    if [[ "${val}" =~ ^\".*\"$ ]]; then
      val="${val:1:-1}"
    elif [[ "${val}" =~ ^\'.*\'$ ]]; then
      val="${val:1:-1}"
    fi
    export "${key}=${val}"
  done < "${tmp_env}"
  rm -f "${tmp_env}"
}

load_dotenv "${APP_DIR}/.env"

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

# --- swap (helps t3.micro / 1GB RAM survive Next builds) ---
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

# --- Resolve public API URL ---
if [[ -n "${PUBLIC_IP}" ]]; then
  if grep -q 'YOUR_PUBLIC_IP' "${APP_DIR}/.env" 2>/dev/null; then
    sed -i "s/YOUR_PUBLIC_IP/${PUBLIC_IP}/g" "${APP_DIR}/.env"
    echo "Replaced YOUR_PUBLIC_IP in .env with ${PUBLIC_IP}"
  fi
fi

load_dotenv "${APP_DIR}/.env"

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

# Ensure CORS includes site origin (admin shares same origin via /console)
if [[ -n "${PUBLIC_IP}" ]]; then
  site_origin="http://${PUBLIC_IP}"
  current_cors="${CORS_ALLOWED_ORIGINS:-}"
  if [[ ",${current_cors}," != *",${site_origin},"* ]]; then
    if [[ -n "${current_cors}" ]]; then
      new_cors="${current_cors},${site_origin}"
    else
      new_cors="${site_origin}"
    fi
    if grep -q '^CORS_ALLOWED_ORIGINS=' "${APP_DIR}/.env"; then
      sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${new_cors}|" "${APP_DIR}/.env"
    else
      echo "CORS_ALLOWED_ORIGINS=${new_cors}" >> "${APP_DIR}/.env"
    fi
    export CORS_ALLOWED_ORIGINS="${new_cors}"
  fi
fi

# --- Ranger frontend ---
echo "==> Frontend install + build"
sudo -u "${APP_USER}" bash <<EOF
set -euo pipefail
cd "${APP_DIR}/frontend"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}"
npm ci
npm run build
EOF

# --- Admin console (served at /console behind nginx) ---
echo "==> Admin install + build"
ADMIN_ENV="${APP_DIR}/admin/.env"
cat > "${ADMIN_ENV}" <<ADMINENV
NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
NEXT_PUBLIC_BASE_PATH=/console
ADMINENV
chown "${APP_USER}:${APP_USER}" "${ADMIN_ENV}"
chmod 600 "${ADMIN_ENV}"

sudo -u "${APP_USER}" bash <<EOF
set -euo pipefail
cd "${APP_DIR}/admin"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}"
export NEXT_PUBLIC_BASE_PATH=/console
npm ci
npm run build
EOF

# --- systemd (copy from repo, rewrite paths/user) ---
echo "==> Installing systemd units"
install_unit() {
  local name="$1"
  local src="${APP_DIR}/deploy/systemd/${name}.service"
  local dest="/etc/systemd/system/${name}.service"
  sed \
    -e "s|/opt/spotoranger|${APP_DIR}|g" \
    -e "s|^User=ubuntu$|User=${APP_USER}|" \
    -e "s|^Group=ubuntu$|Group=${APP_USER}|" \
    "${src}" > "${dest}"
}

install_unit spoto-ranger-api
install_unit spoto-ranger-web
install_unit spoto-ranger-admin

systemctl daemon-reload
systemctl enable --now spoto-ranger-api spoto-ranger-web spoto-ranger-admin

# --- Nginx IP mode ---
echo "==> Configuring Nginx (/, /console, /api)"
cp "${APP_DIR}/deploy/nginx/spoto-ranger-ip.conf" /etc/nginx/sites-available/spoto-ranger
rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/spoto-ranger /etc/nginx/sites-enabled/spoto-ranger
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "============================================"
echo " Spoto Ranger is up (min-cost single EC2)"
echo " Ranger:   http://${PUBLIC_IP:-YOUR_IP}"
echo " Admin:    http://${PUBLIC_IP:-YOUR_IP}/console"
echo " API docs: http://${PUBLIC_IP:-YOUR_IP}/api/docs"
echo " Health:   http://${PUBLIC_IP:-YOUR_IP}/api/health"
echo "============================================"
echo "Check: sudo systemctl status spoto-ranger-api spoto-ranger-web spoto-ranger-admin nginx"
