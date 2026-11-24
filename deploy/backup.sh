#!/usr/bin/env bash
# Backup diário do banco (guarda os últimos 14). Agendado pelo cron às 4h.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres cardapio | gzip > "backups/cardapio-$(date +%F).sql.gz"
ls -1t backups/*.sql.gz | tail -n +15 | xargs -r rm -f
