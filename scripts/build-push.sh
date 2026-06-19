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

# Loads NEXT_PUBLIC_* build args from .env for the frontend image.
export $(grep -v '^#' .env | grep -E '^(NEXT_PUBLIC_|GOOGLE_OAUTH_)' | xargs) 2>/dev/null || true

echo ">> Building linux/arm64 images and pushing to GHCR..."
docker buildx bake \
  -f docker-compose.prod.yml \
  --set "*.platform=linux/arm64" \
  --push

echo ">> Done. On the Pi run:  docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"
