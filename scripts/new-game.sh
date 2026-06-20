#!/usr/bin/env bash
# Scaffold a new in-repo game source at games-src/<id>/.
#
# Creates a minimal, no-build static game pre-wired with the SkillForge
# postMessage score/stats contract (PLAYER_INFO in; BEST_SCORE + GAME_STATS
# out). Edit it, then publish with:  ./scripts/build-game.sh <id>
#
# For a build-based game (Vite/React export, e.g. from Google AI Studio),
# don't use this — just drop the exported project at games-src/<id>/ (make sure
# its vite.config has `base: './'`) and run scripts/build-game.sh <id>.
#
# Usage:
#   ./scripts/new-game.sh <game-id> ["Display Name"]
set -euo pipefail
cd "$(dirname "$0")/.."

id="${1:-}"
name="${2:-$id}"
if [[ -z "$id" || ! "$id" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "usage: $0 <game-id> [\"Display Name\"]   (id = lowercase-kebab-case)" >&2
  exit 1
fi
dest="games-src/$id"
if [[ -e "$dest" ]]; then
  echo "!! $dest already exists" >&2
  exit 1
fi
mkdir -p "$dest"

cat > "$dest/index.html" <<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <style>
    /* Responsive on desktop & mobile (project requirement). */
    html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
    body { display: grid; place-items: center; background: #0f172a; color: #e2e8f0; }
    .card { text-align: center; padding: 1.5rem; }
    button { font-size: 1.1rem; padding: 0.75rem 1.25rem; border-radius: 0.75rem;
             border: 0; background: #6366f1; color: white; cursor: pointer; }
    h1 { font-size: clamp(1.25rem, 5vw, 2rem); }
  </style>
</head>
<body>
  <div class="card">
    <h1>${name}</h1>
    <p>Score: <span id="score">0</span></p>
    <button id="tap">Tap to score</button>
    <p><button id="end">End game</button></p>
  </div>

  <script>
    // --- SkillForge iframe contract -------------------------------------
    var GAME_ID = '${id}';
    var player = null;

    function postToParent(event, data) {
      window.parent.postMessage({ type: 'GAME_EVENT', event: event, data: data }, '*');
    }

    // Parent -> game: player identity / saved progress.
    window.addEventListener('message', function (e) {
      var msg = e.data || {};
      if (msg.type === 'PLAYER_INFO') { player = msg.data; }
      if (msg.type === 'RESTORE_PROGRESS') { /* apply msg.data here if used */ }
    });

    // Optional cross-device progress sync: ask the host on load.
    window.parent.postMessage({ type: 'REQUEST_PROGRESS' }, '*');

    // --- Demo gameplay (replace with your game) -------------------------
    var score = 0;
    var scoreEl = document.getElementById('score');
    document.getElementById('tap').addEventListener('click', function () {
      score += 1; scoreEl.textContent = String(score);
    });

    document.getElementById('end').addEventListener('click', function () {
      // Required: best score (host keeps the max, write-if-higher).
      postToParent('BEST_SCORE', { bestScore: score });

      // Required for the profile "Matches" counter: a totalGames count.
      var total = parseInt(localStorage.getItem(GAME_ID + '-total-games') || '0', 10) + 1;
      localStorage.setItem(GAME_ID + '-total-games', String(total));
      postToParent('GAME_STATS', { totalGames: total, lastScore: score });

      score = 0; scoreEl.textContent = '0';
    });
  </script>
</body>
</html>
HTML

echo ">> created $dest/index.html"
echo ">> 1. edit games-src/$id/index.html"
echo ">> 2. ./scripts/build-game.sh $id"
echo ">> 3. add an entry to app/games/games.ts (id: '$id'), then commit public/games/$id/"
