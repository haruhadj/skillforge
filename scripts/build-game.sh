#!/usr/bin/env bash
# Build one in-repo game's source and publish it to public/games/<id>/.
#
#   Source of truth (git-ignored, local-only):  games-src/<id>/
#   Deployable artifact (committed to git):      public/games/<id>/
#
# Never hand-edit public/games/<id>/ — it is always reproducible from
# games-src/<id>/ via this script.
#
# A game is "buildable" when games-src/<id>/package.json exists (Vite/Node):
# we run its build and publish the build output (dist/ or build/).
# Otherwise it is a plain static game and the folder is published as-is.
#
# Usage:
#   ./scripts/build-game.sh <game-id>     # build & publish one game
#   ./scripts/build-game.sh --all         # build every game under games-src/
#
# After building, register new games in app/games/games.ts and commit
# public/games/<id>/.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC_ROOT="games-src"
DEST_ROOT="public/games"

build_one() {
  local id="$1"
  # Guard: never run with an empty/odd id — we rm -rf the destination below.
  if [[ -z "$id" || ! "$id" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    echo "!! invalid game id: '$id' (use lowercase-kebab-case)" >&2
    return 1
  fi
  local src="$SRC_ROOT/$id"
  local dest="$DEST_ROOT/$id"
  if [[ ! -d "$src" ]]; then
    echo "!! no source folder at $src" >&2
    return 1
  fi

  echo ">> [$id] building..."
  local publish_dir="$src"   # default: static game — publish the folder itself

  if [[ -f "$src/package.json" ]]; then
    ( cd "$src"
      if [[ ! -d node_modules ]]; then
        # Each game under games-src/ installs in isolation here — its own local
        # package-lock.json + node_modules in the game folder — so a game's
        # pinned React/Vite versions never collide with the root app's lockfile.
        # See docs/ADDING_GAMES.md.
        echo ">> [$id] installing deps (npm install)..."
        npm install
      fi
      echo ">> [$id] npm run build..."
      npm run build
    )
    if   [[ -d "$src/dist"  ]]; then publish_dir="$src/dist"
    elif [[ -d "$src/build" ]]; then publish_dir="$src/build"
    else
      echo "!! [$id] build produced no dist/ or build/ output" >&2
      return 1
    fi
  fi

  # Preserve a curated cover.webp (the library thumbnail served by GameCover)
  # when the build itself does not emit one. Covers are usually added separately
  # from the build.
  local tmp_cover=""
  if [[ -f "$dest/cover.webp" && ! -f "$publish_dir/cover.webp" ]]; then
    tmp_cover="$(mktemp)"
    cp "$dest/cover.webp" "$tmp_cover"
  fi

  echo ">> [$id] publishing -> $dest"
  rm -rf "$dest"
  mkdir -p "$dest"
  cp -R "$publish_dir/." "$dest/"
  rm -rf "$dest/node_modules" "$dest/.git"   # never ship these (static-game case)

  if [[ -n "$tmp_cover" ]]; then
    cp "$tmp_cover" "$dest/cover.webp"
    rm -f "$tmp_cover"
  fi

  if [[ ! -f "$dest/index.html" ]]; then
    echo "!! [$id] WARNING: no index.html in $dest — the iframe will not load" >&2
  fi
  echo ">> [$id] done."
}

if [[ "${1:-}" == "--all" ]]; then
  found=0
  for d in "$SRC_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    found=1
    build_one "$(basename "$d")"
  done
  [[ "$found" == 1 ]] || { echo "no games found under $SRC_ROOT/"; exit 0; }
elif [[ -n "${1:-}" ]]; then
  build_one "$1"
else
  echo "usage: $0 <game-id> | --all" >&2
  exit 1
fi

echo ""
echo ">> Next: register new games in app/games/games.ts, then commit public/games/<id>/."
