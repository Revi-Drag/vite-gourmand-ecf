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

echo "[entrypoint] Prepare php-fpm socket directory..."
mkdir -p /var/run
chown -R nginx:nginx /var/run

echo "[entrypoint] ENV PORT='$PORT'"
echo "[entrypoint] ENV RAILWAY_TCP_PROXY_PORT='$RAILWAY_TCP_PROXY_PORT'"
echo "[entrypoint] ENV RAILWAY_PUBLIC_DOMAIN='$RAILWAY_PUBLIC_DOMAIN'"

echo "[entrypoint] Start php-fpm..."
php-fpm -D

# Railway injecte souvent PORT. Si absent, fallback local.
export PORT="${PORT:-8080}"
echo "[entrypoint] Using PORT=$PORT"

echo "[entrypoint] Render nginx.conf with PORT=$PORT"
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

echo "[entrypoint] Effective listen line:"
grep -n "listen" /etc/nginx/http.d/default.conf || true
nginx -t

echo "[entrypoint] Start nginx (foreground)..."
exec nginx -g "daemon off;"
