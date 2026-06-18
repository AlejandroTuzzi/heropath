#!/usr/bin/env bash
# Actualiza HeroPath en el servidor: trae los cambios y reconstruye los contenedores.
# Uso (desde /opt/heropath):  ./update.sh
set -e
cd "$(dirname "$0")"

echo "==> Trayendo cambios de GitHub..."
git pull

echo "==> Reconstruyendo y reiniciando app + worker..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Limpiando imágenes viejas..."
docker image prune -f >/dev/null 2>&1 || true

echo "==> Estado de los servicios:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "==> Listo ✅  (logs de la app:  docker compose -f docker-compose.prod.yml logs -f app)"
