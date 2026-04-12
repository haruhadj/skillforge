# AI Agent Guide: Integrating a New Game into SkillForge

> **For AI agents and LLMs.** Follow every numbered step in order to fully integrate
> a game into the SkillForge thesis project. Do not skip steps.

---

## Overview

SkillForge embeds games inside iframes. To fully integrate a new game you must:

1. Register the game in `src/games/games.js`
2. Deploy the game's static files to `public/games/<game-id>/`
3. Add postMessage data collection to the game's source code
4. (If the game has a backend) wire up the server

The sections below cover each step in full detail.

---

## STEP 1 — Determine the game ID

The `gameId` is a **lowercase-kebab-case** string that:
- Matches the folder name under `public/games/<game-id>/`
- Matches the `id` field in `src/games/games.js`
- Is used as the Firestore document ID: `users/{uid}/scores/{gameId}`

Example: `"math-game"`, `"spelling-bee"`, `"chroma-memory"`

---

## STEP 2 — Register the game in `src/games/games.js`

File: `src/games/games.js`

Add an entry to the `games` array:

```js
{
  id: '<game-id>',          // kebab-case, matches public/games/<game-id>/
  name: 'Display Name',     // shown in the game library UI
  iframePath: '/games/<game-id>/index.html',
},
```

**Full example:**
```js
// src/games/games.js
export const games = [
  // ... existing games ...
  {
    id: 'my-new-game',
    name: 'My New Game',
    iframePath: '/games/my-new-game/index.html',
  },
]
```

No other changes to `GamePlayer.jsx` or any other parent-app file are needed
**unless** the game requires special score aggregation (see Step 5 — Special Cases).

---

## STEP 3 — Deploy the game's static files

The game must be served as static files under `public/games/<game-id>/`.

### For plain HTML/JS/CSS games
Copy the entire game folder into `public/games/<game-id>/`.
The file `public/games/<game-id>/index.html` must exist.

### For React/Vite games
1. In the game's `vite.config.js`, set `base: './'` so assets use relative paths:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: './',   // REQUIRED — do not omit
   })
   ```
2. Build the game: `pnpm run build` (or `npm run build`)
3. Copy the contents of `dist/` (not the folder itself) to `public/games/<game-id>/`:
   ```powershell
   New-Item -ItemType Directory -Force -Path public\games\<game-id>
   Copy-Item -Path "path\to\game\dist\*" -Destination "public\games\<game-id>" -Recurse -Force
   ```

Expected layout after deployment:
```
public/games/<game-id>/
  index.html        ← required entry point
  assets/           ← JS/CSS bundles (Vite games)
  cover.png         ← optional thumbnail (shown in game library)
```

---

## STEP 4 — Add postMessage data collection to the game source

The game runs inside an iframe. `GamePlayer.jsx` (the parent) communicates
bidirectionally via `postMessage`:

- **Game → Parent:** report scores and save progress
- **Parent → Game:** restore saved progress, deliver player identity

> **Security note:** The parent only accepts messages from `window.location.origin`
> (same origin). The game files are served from the same origin as the main app,
> so this works automatically. Always guard outgoing calls with
> `window.parent && window.parent !== window` so the game still works standalone.

---

### PART A — Score reporting (required for ALL games)

1. Find where the game round/session **ends** (game over screen, results screen,
   final score calculated).

2. Add the `postToParent` helper once near the top of the file (or in a shared
   module):

   ```js
   function postToParent(event, data) {
     if (window.parent && window.parent !== window) {
       window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
     }
   }
   ```

3. At the game-end point, send the best score:

   ```js
   // bestScore = the BEST score ever achieved, not just this round
   const bestScore = Math.max(previousBestScore, currentScore);
   postToParent('BEST_SCORE', { bestScore });
   ```

   - Use the game's existing high-score / best-score tracking if it has one.
   - If it doesn't, read from `localStorage` and compare:
     ```js
     const prev = Number(localStorage.getItem('bestScore') || 0);
     const bestScore = Math.max(prev, currentScore);
     localStorage.setItem('bestScore', bestScore);
     postToParent('BEST_SCORE', { bestScore });
     ```

**Rules (must be exact):**
- `type` MUST be the string `'GAME_EVENT'`
- `event` MUST be the string `'BEST_SCORE'`
- `data.bestScore` MUST be a `number`
- Fire on every game end — the parent handles deduplication

---

### PART B — Progress persistence (for games with history/stats)

If the game tracks any data the user would want preserved across
sessions/devices (history, high scores, settings, total plays, etc.),
add this four-step sync.

#### B1. Send progress after each game ends

Right after the `BEST_SCORE` call, send the full state:

```js
postToParent('GAME_STATS', {
  // Send whatever the game tracks. Common shapes:
  history: updatedHistoryArray,         // array of past game results
  bestScore: bestScore,                 // if not already in history
  totalGames: totalGames,               // running counter
  // ... any other persistent fields
});
```

Firestore path: `users/{uid}/scores/{gameId}` (merged into the same document).

#### B2. Request saved progress on load

When the game first initialises (page load / component mount):

```js
postToParent('REQUEST_PROGRESS', undefined);
```

#### B3. Listen for restored progress

The parent responds with a `RESTORE_PROGRESS` message:

```js
window.addEventListener('message', function handleRestore(event) {
  const msg = event.data;
  if (!msg || msg.type !== 'RESTORE_PROGRESS') return;
  if (!msg.data) return;

  // Merge remote data with local data, then persist
  const merged = mergeStats(localData, msg.data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  // update in-memory state as needed
});
```

#### B4. Merge strategy for history arrays

```js
function mergeStats(local, remote) {
  if (!remote || !Array.isArray(remote.history)) return local;
  const localIds = new Set(local.history.map((g) => g.id));
  const newEntries = remote.history.filter((g) => !localIds.has(g.id));
  if (newEntries.length === 0) return local;
  return {
    ...local,
    history: [...local.history, ...newEntries].sort((a, b) => a.id - b.id),
  };
}
```

- Each history entry MUST have a unique `id` field (use `Date.now()` at creation).
- Always deduplicate by `id` when merging.
- Sort by `id` (which is a timestamp) after merging.

---

### PART C — Receiving player identity (optional but recommended)

`GamePlayer.jsx` automatically sends player info to the iframe after load and
retries for ~3 seconds to ensure delivery. The game can listen for it to
personalise the experience:

```js
window.addEventListener('message', function(event) {
  const msg = event.data;
  if (!msg || msg.type !== 'PLAYER_INFO') return;
  const { name, uid, email } = msg.data;
  // use name/uid/email as needed (e.g. display player name)
});
```

If the game needs the info before rendering, it can also request it:

```js
if (window.parent && window.parent !== window) {
  window.parent.postMessage({ type: 'REQUEST_PLAYER_INFO' }, '*');
}
```

---

## STEP 5 — Special cases

### Games with multiplayer modes (e.g. chroma-memory)

If the game has distinct singleplayer/multiplayer modes AND per-mode score
aggregation is needed, the `GAME_STATS` message must include a `mode` field:

```js
postToParent('GAME_STATS', {
  mode: 'singleplayer',  // or 'multiplayer'
  accuracyPercentage: score, // or score / finalScore / averageScore
  // ... other fields
});
```

`GamePlayer.jsx` detects the `gameId === 'chroma-memory'` case and routes it to
`saveModeScoreStats()` instead of `saveGameStats()`. For any **new** game that
needs the same per-mode weighted aggregation, you must also add a matching
`gameId`-specific branch in `GamePlayer.jsx`'s `handleMessage` function:

```js
// In GamePlayer.jsx — handleMessage — inside the GAME_STATS block:
if (msg.event === 'GAME_STATS') {
  if (gameId === 'my-new-game') {
    const mode = msg.data?.mode === 'multiplayer' ? 'multiplayer' : 'singleplayer';
    const score = Number(msg.data?.score ?? 0);
    if (!Number.isNaN(score)) saveModeScoreStats(uid, gameId, mode, score);
    return;
  }
  saveGameStats(uid, gameId, msg.data);
}
```

### Games with a backend server

1. Put server code under `server/games/<game-id>/server.js` (or `socket-server.js`).
2. Read the port from an env var: `process.env.MY_GAME_PORT || 3002`.
3. Remove any static-file serving from the server (Vite handles that).
4. Register the server in `server/start-all.js`:
   ```js
   { name: 'My Game', script: path.join(__dirname, 'games', '<game-id>', 'server.js') }
   ```
5. If the frontend calls REST endpoints, add a Vite proxy in `vite.config.js`:
   ```js
   server: { proxy: { '/api/my-game': 'http://localhost:<port>' } }
   ```
6. If the frontend uses WebSocket (socket.io), the client connects directly to
   the port — no proxy needed. Make sure the socket server's CORS config allows
   `window.location.origin`.

---

## Complete message reference

### Game → Parent (game sets `type: 'GAME_EVENT'`)

| `event`            | `data` shape                              | handled by               |
|--------------------|-------------------------------------------|--------------------------|
| `BEST_SCORE`       | `{ bestScore: number }`                   | `saveBestScore()`        |
| `GAME_STATS`       | `{ history?: [...], ...anyFields }`       | `saveGameStats()` or `saveModeScoreStats()` |
| `REQUEST_PROGRESS` | (omit data)                               | fetches Firestore → sends `RESTORE_PROGRESS` |
| `REQUEST_PLAYER_INFO` | (omit data)                            | re-sends `PLAYER_INFO`   |

### Parent → Game

| `type`               | `data` shape                        | purpose                        |
|----------------------|-------------------------------------|--------------------------------|
| `RESTORE_PROGRESS`   | saved stats object from Firestore   | restore cross-device progress  |
| `PLAYER_INFO`        | `{ name, uid, email }`              | player identity                |

---

## Code templates

### React game (hooks)

```jsx
// helpers.js — shared across the game
export function postToParent(event, data) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export function mergeStats(local, remote) {
  if (!remote || !Array.isArray(remote.history)) return local;
  const localIds = new Set(local.history.map((g) => g.id));
  const newEntries = remote.history.filter((g) => !localIds.has(g.id));
  if (newEntries.length === 0) return local;
  return {
    ...local,
    history: [...local.history, ...newEntries].sort((a, b) => a.id - b.id),
  };
}

// In your data/stats hook:
useEffect(() => {
  postToParent('REQUEST_PROGRESS', undefined);

  function onMessage(event) {
    const msg = event.data;
    if (msg?.type === 'RESTORE_PROGRESS' && msg.data) {
      setData(prev => {
        const merged = mergeStats(prev, msg.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }
    if (msg?.type === 'PLAYER_INFO' && msg.data) {
      setPlayerInfo(msg.data); // { name, uid, email }
    }
  }
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}, []);

// In your game-end handler:
function handleGameEnd(score) {
  const entry = { id: Date.now(), score, date: new Date().toISOString() };
  const updatedHistory = [...data.history, entry];
  const bestScore = Math.max(data.bestScore || 0, score);
  const updatedData = { ...data, history: updatedHistory, bestScore };

  setData(updatedData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

  postToParent('BEST_SCORE', { bestScore });
  postToParent('GAME_STATS', updatedData);
}
```

### Vanilla JS game (localStorage)

```js
// At the top of the main JS file:
function postToParent(event, data) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

// On page load:
postToParent('REQUEST_PROGRESS', undefined);

window.addEventListener('message', function(e) {
  const msg = e.data;

  if (msg?.type === 'RESTORE_PROGRESS' && msg.data) {
    // Restore fields from Firebase into localStorage
    if (msg.data.bestScore != null)
      localStorage.setItem('bestScore', msg.data.bestScore);
    // update any in-memory variables that were read from localStorage at startup
    bestScore = Number(localStorage.getItem('bestScore') || 0);
  }

  if (msg?.type === 'PLAYER_INFO' && msg.data) {
    playerName = msg.data.name;
  }
});

// When the game ends:
function onGameOver(currentScore) {
  const prev = Number(localStorage.getItem('bestScore') || 0);
  const bestScore = Math.max(prev, currentScore);
  localStorage.setItem('bestScore', bestScore);

  postToParent('BEST_SCORE', { bestScore });
  postToParent('GAME_STATS', {
    bestScore,
    totalGames: Number(localStorage.getItem('totalGames') || 0) + 1,
    // ... whatever else the game tracks
  });
}
```

---

## Integration checklist (verify before finishing)

- [ ] `src/games/games.js` has an entry with the correct `id`, `name`, and `iframePath`
- [ ] `public/games/<game-id>/index.html` exists and loads correctly in a browser
- [ ] (Vite games) `vite.config.js` has `base: './'` and the game was rebuilt
- [ ] `postToParent` helper is defined in the game source
- [ ] `BEST_SCORE` is sent on every game-end with a numeric `bestScore`
- [ ] `GAME_STATS` is sent on every game-end with the full persistent state
- [ ] `REQUEST_PROGRESS` is sent on game load
- [ ] `RESTORE_PROGRESS` listener merges remote data without duplicating entries
- [ ] Each history entry has a unique numeric `id` (e.g. `Date.now()`)
- [ ] (If multiplayer) `mode` field is included in `GAME_STATS`; `GamePlayer.jsx` updated if needed
- [ ] (If backend) server registered in `server/start-all.js` and ports set in `.env`
- [ ] Game works correctly when opened standalone (outside the iframe)
