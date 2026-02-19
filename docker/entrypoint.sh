#!/usr/bin/env sh
set -e

echo "[entrypoint] APP_ENV=$APP_ENV APP_DEBUG=$APP_DEBUG"

# Affiche DATABASE_URL sans le password (utile debug)
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL set: $(echo "$DATABASE_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1****@#')"
else
  echo "[entrypoint] DATABASE_URL is EMPTY"
fi

echo "[entrypoint] Try migrations (non-blocking)..."
php bin/console doctrine:migrations:migrate -n || echo "[entrypoint] migrations skipped (db not ready)"

echo "[entrypoint] Warmup cache (non-blocking)..."
php bin/console cache:clear --env=prod || true

echo "[entrypoint] Start php-fpm..."
php-fpm -D

echo "[entrypoint] Use nginx.conf (listen 9000)"
cp /etc/nginx/http.d/default.conf.template /etc/nginx/http.d/default.conf

echo "[entrypoint] Effective listen line:"
grep -n "listen" /etc/nginx/http.d/default.conf || true
nginx -t

echo "[entrypoint] Start nginx (foreground)..."
exec nginx -g "daemon off;"
