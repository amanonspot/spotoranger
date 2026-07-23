#!/usr/bin/env bash
# DuckDNS subdomain + Let's Encrypt HTTPS for Spoto Ranger (single EC2).
#
# Prerequisites:
#   1. Create subdomain at https://www.duckdns.org (sign in with Google/GitHub)
#   2. AWS Security Group: allow inbound TCP 443 from 0.0.0.0/0 (and keep 80)
#   3. Run as root on the EC2:
#
#      sudo DUCKDNS_SUBDOMAIN=spotoranger DUCKDNS_TOKEN=your-token-here \
#        bash /opt/spotoranger/deploy/setup-duckdns-https.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/spotoranger}"
APP_USER="${APP_USER:-ubuntu}"
SUBDOMAIN="${DUCKDNS_SUBDOMAIN:?Set DUCKDNS_SUBDOMAIN (e.g. spotoranger — without .duckdns.org)}"
TOKEN="${DUCKDNS_TOKEN:?Set DUCKDNS_TOKEN from duckdns.org}"

# strip accidental .duckdns.org suffix
SUBDOMAIN="${SUBDOMAIN%.duckdns.org}"
FQDN="${SUBDOMAIN}.duckdns.org"
PUBLIC_URL="https://${FQDN}"
API_URL="${PUBLIC_URL}/api"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo DUCKDNS_SUBDOMAIN=... DUCKDNS_TOKEN=... bash $0"
  exit 1
fi

echo "==> DuckDNS: ${FQDN} → this server"
UPDATE="$(curl -fsS "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=" || true)"
echo "DuckDNS response: ${UPDATE}"
if [[ "${UPDATE}" != "OK" ]]; then
  echo "DuckDNS update failed. Check subdomain + token."
  exit 1
fi

# Persist updater (EC2 public IP can change without Elastic IP)
mkdir -p /opt/duckdns
cat > /opt/duckdns/duck.sh <<EOF
#!/usr/bin/env bash
echo url="https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=" | curl -k -o /opt/duckdns/duck.log -K -
EOF
chmod 700 /opt/duckdns/duck.sh
(crontab -l 2>/dev/null | grep -v duckdns/duck.sh || true; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo "==> Waiting for DNS to propagate"
for i in $(seq 1 18); do
  resolved="$(dig +short "${FQDN}" A | tail -n1 || true)"
  echo "  try ${i}: ${FQDN} → ${resolved:-none}"
  if [[ -n "${resolved}" ]]; then
    break
  fi
  sleep 5
done

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y certbot python3-certbot-nginx dnsutils

# Nginx HTTP first (Certbot needs port 80 + correct server_name)
echo "==> Writing Nginx site for ${FQDN}"
cat > /etc/nginx/sites-available/spoto-ranger <<NGINX
# Spoto Ranger — DuckDNS + HTTPS (Certbot will add ssl listen blocks)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${FQDN};

    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /console {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sfn /etc/nginx/sites-available/spoto-ranger /etc/nginx/sites-enabled/spoto-ranger
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Issuing Let's Encrypt certificate"
certbot --nginx -d "${FQDN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect

# Update root .env for API hosts / CORS / public URL
ENV_FILE="${APP_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

echo "==> Updating ${ENV_FILE}"
upsert() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
  else
    echo "${key}=${val}" >> "${ENV_FILE}"
  fi
}

upsert NEXT_PUBLIC_API_BASE_URL "${API_URL}"
upsert DJANGO_ALLOWED_HOSTS "${FQDN},localhost,127.0.0.1,3.110.101.147"
upsert CORS_ALLOWED_ORIGINS "${PUBLIC_URL},http://localhost:3000,http://localhost:3001"
upsert SECURE_SSL_REDIRECT false

# Admin env for Next basePath build
cat > "${APP_DIR}/admin/.env" <<ADMINENV
NEXT_PUBLIC_API_BASE_URL=${API_URL}
NEXT_PUBLIC_BASE_PATH=/console
ADMINENV
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/admin/.env"
chmod 600 "${APP_DIR}/admin/.env"

echo "==> Rebuilding Ranger + Admin (HTTPS API URL baked in)"
sudo -u "${APP_USER}" bash <<EOF
set -euo pipefail
cd "${APP_DIR}/frontend"
export NEXT_PUBLIC_API_BASE_URL="${API_URL}"
npm ci
npm run build
cd "${APP_DIR}/admin"
export NEXT_PUBLIC_API_BASE_URL="${API_URL}"
export NEXT_PUBLIC_BASE_PATH=/console
npm ci
npm run build
EOF

systemctl restart spoto-ranger-api spoto-ranger-web spoto-ranger-admin nginx

echo ""
echo "============================================"
echo " HTTPS ready"
echo " Ranger:  ${PUBLIC_URL}"
echo " Admin:   ${PUBLIC_URL}/console"
echo " API:     ${API_URL}/docs"
echo "============================================"
echo "Cert renews via: sudo certbot renew (timer usually installed)"
