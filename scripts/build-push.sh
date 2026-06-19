#!/usr/bin/env bash
# Build arm64 images on this PC (WSL/amd64 via QEMU) and push to GHCR.
# The Raspberry Pi never compiles — it only pulls + runs.
#
# One-time setup:
#   echo $GHCR_TOKEN | docker login ghcr.io -u haruhadj --password-stdin
#   (GHCR_TOKEN = a GitHub PAT with write:packages)
#
# Usage:  ./scripts/build-push.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Guard: Windows/WSL editors save .env with CRLF, which bakes a stray '\r'
# onto every value (e.g. NEXT_PUBLIC_APP_URL -> breaks the OAuth redirect_uri).
# Strip carriage returns from env files before they reach the build.
for envf in .env .env.local server/.env; do
  [ -f "$envf" ] && sed -i 's/\r$//' "$envf"
done

# Loads NEXT_PUBLIC_* build args from .env for the frontend image.
export $(grep -v '^#' .env | grep -E '^(NEXT_PUBLIC_|GOOGLE_OAUTH_)' | xargs) 2>/dev/null || true

echo ">> Building linux/arm64 images and pushing to GHCR..."
docker buildx bake \
  -f docker-compose.prod.yml \
  --set "*.platform=linux/arm64" \
  --push

echo ">> Done. On the Pi run:  docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"
