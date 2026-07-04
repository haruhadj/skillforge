#!/bin/sh
# Turn the optional Anubis bot-protection layer on or off in production.
#
# Usage: scripts/toggle-anubis.sh on|off
#
# "on"  applies docker-compose.anubis.yml on top of the prod stack: nginx
#       loses its direct host port binding and Anubis takes over 1234,
#       forwarding everything through to nginx unchanged.
# "off" stops/removes the anubis container and recreates nginx so it goes
#       back to binding 1234 directly, exactly like docker-compose.prod.yml
#       alone describes.
set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml -f docker-compose.anubis.yml"

case "$1" in
  on)
    if [ -z "$ANUBIS_ED25519_KEY" ] && ! grep -q '^ANUBIS_ED25519_KEY=.\+' .env 2>/dev/null; then
      echo "ANUBIS_ED25519_KEY is not set in .env - generate one with:" >&2
      echo "  openssl rand -hex 32" >&2
      echo "and add it to .env as ANUBIS_ED25519_KEY=<value> before turning this on." >&2
      exit 1
    fi
    $COMPOSE up -d --force-recreate nginx anubis
    ;;
  off)
    $COMPOSE stop anubis
    $COMPOSE rm -f anubis
    docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
    ;;
  *)
    echo "Usage: $0 on|off" >&2
    exit 1
    ;;
esac
