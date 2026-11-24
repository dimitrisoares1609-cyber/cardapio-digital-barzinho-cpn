#!/usr/bin/env bash
# Publica (ou atualiza) o Cardápio Digital na VPS.
#   uso:  ./deploy/deploy.sh                 → usa os endereços já salvos no .env
#         ./deploy/deploy.sh barcpn.tech     → define o domínio principal (www incluso)
set -euo pipefail
cd "$(dirname "$0")/.."

HOSTNAME_VPS="$(hostname -f 2>/dev/null || hostname)"
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

if [ ! -f .env ]; then
  ADMIN_PASS="$(rand 16)"
  cat > .env <<ENV
PRIMARY_DOMAIN=${HOSTNAME_VPS}
SITE_ADDRESSES=${HOSTNAME_VPS}
POSTGRES_PASSWORD=$(rand 32)
JWT_SECRET=$(rand 64)
ADMIN_EMAIL=admin@barzinhocpn.com.br
ADMIN_PASSWORD=${ADMIN_PASS}
ENV
  chmod 600 .env
  echo "==> .env criado com senhas novas."
fi

if [ "${1:-}" != "" ]; then
  DOMAIN="$1"
  sed -i "s|^PRIMARY_DOMAIN=.*|PRIMARY_DOMAIN=${DOMAIN}|" .env
  sed -i "s|^SITE_ADDRESSES=.*|SITE_ADDRESSES=${DOMAIN}, www.${DOMAIN}, ${HOSTNAME_VPS}|" .env
  echo "==> Domínio principal: ${DOMAIN}"
fi

docker compose -f docker-compose.prod.yml --env-file .env up -d --build --remove-orphans
docker image prune -f >/dev/null 2>&1 || true

set -a; . ./.env; set +a
echo
echo "================ CARDÁPIO NO AR ================"
echo " Cardápio:  https://${PRIMARY_DOMAIN}"
echo " Painel:    https://${PRIMARY_DOMAIN}/admin"
echo " Login:     ${ADMIN_EMAIL}"
echo " Senha:     (veja com:  grep ADMIN_PASSWORD $(pwd)/.env)"
echo "================================================"
