#!/bin/sh
set -e

# Wait for Postgres
if [ -n "$POSTGRES_HOST" ]; then
  echo "Waiting for Postgres at $POSTGRES_HOST:$POSTGRES_PORT..."
  until nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
    sleep 1
  done
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting Daphne..."
exec daphne -b 0.0.0.0 -p 8000 chatserver.asgi:application

