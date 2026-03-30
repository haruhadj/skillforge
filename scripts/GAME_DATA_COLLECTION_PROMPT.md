# AI Prompt: Add Data Collection to a Game for SkillForge

> **Copy and paste this prompt into your AI chat when working on a game's source code to integrate it with the SkillForge thesis project's data collection system.**

---

## Prompt

```
I need you to add data collection integration to this game so it can communicate
scores AND game progress back to a parent app (SkillForge) when embedded in an
iframe. There are two parts: (A) score reporting, and (B) progress persistence.

## How it works

The game runs inside an iframe. The parent app (GamePlayer.jsx) listens for
`window.message` events. Communication is bidirectional:
- Game → Parent: report scores and save progress
- Parent → Game: restore previously saved progress on load

All messages use `window.parent.postMessage()` (game→parent) or
`iframe.contentWindow.postMessage()` (parent→game).

---

## PART A — Score reporting (required for all games)

1. Find the place in the code where a game round/session ENDS (game over, results
   screen, final score calculated, etc.)

2. At that point, add this postMessage call:

   ```js
   if (window.parent && window.parent !== window) {
     window.parent.postMessage({
       type: 'GAME_EVENT',
       event: 'BEST_SCORE',
       data: { bestScore: <SCORE_VALUE_HERE> }
     }, '*');
   }
   ```

3. The `bestScore` value should be the BEST score the player has achieved, not just
   the current round's score. If the game already tracks a "best score" or "high
   score" in localStorage or state, use that. If not, compute it as:
   `Math.max(previousBest, currentScore)`

### Score rules

- The `type` MUST be exactly `'GAME_EVENT'` (string)
- The `event` MUST be exactly `'BEST_SCORE'` (string)
- The `data` object MUST contain a `bestScore` property (number)
- Always guard with `window.parent && window.parent !== window` so the game still
  works standalone outside an iframe
- Do NOT import any external dependencies — it's just the browser postMessage API
- This should fire every time the game ends. The parent app handles deduplication.

---

## PART B — Progress persistence (for games with stats/history)

If the game tracks progress, history, stats, or any data the user would want to
keep across sessions/devices, add this two-way sync:

### Step 1: Create a helper for posting messages

```js
function postToParent(event, data) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}
```

### Step 2: Send progress after each game ends

After the game ends (same place as the BEST_SCORE call), also send the full
progress/stats data:

```js
postToParent('GAME_STATS', {
  // Include whatever data structure the game uses for persistence.
  // For example, a game with a history array:
  history: updatedHistoryArray,
  // Or for a game with settings + progress:
  // settings: { ... },
  // progress: { ... },
});
```

The parent saves this under Firestore: `users/{uid}/scores/{gameId}.stats`

### Step 3: Request saved progress on load

When the game mounts, request previously saved data from the parent:

```js
// On mount / initialization:
if (window.parent && window.parent !== window) {
  window.parent.postMessage({
    type: 'GAME_EVENT',
    event: 'REQUEST_PROGRESS'
  }, '*');
}
```

### Step 4: Listen for restored progress

The parent responds with a `RESTORE_PROGRESS` message. Listen for it and merge
the data into local state:

```js
window.addEventListener('message', function(event) {
  const msg = event.data;
  if (!msg || msg.type !== 'RESTORE_PROGRESS') return;
  if (msg.data) {
    // Merge remote data with local data (localStorage).
    // Deduplicate by ID/timestamp to avoid duplicates.
    // Then update both localStorage and in-memory state.
  }
});
```

### Progress merge strategy

When merging remote (Firebase) data with local (localStorage) data:
- Use a unique ID on each history entry (e.g. `Date.now()` at creation time)
- Keep entries from both sources, deduplicating by ID
- Sort by timestamp after merging
- Persist the merged result back to localStorage

Example merge function:
```js
function mergeData(local, remote) {
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

---

## Message schemas (summary)

### Game → Parent messages (type: 'GAME_EVENT')

| event             | data                          | purpose                          |
|-------------------|-------------------------------|----------------------------------|
| `BEST_SCORE`      | `{ bestScore: number }`       | Report best score for leaderboard|
| `GAME_STATS`      | `{ history: [...], ... }`     | Save full game progress/stats    |
| `REQUEST_PROGRESS`| (none)                        | Ask parent for saved progress    |

### Parent → Game messages (type: 'RESTORE_PROGRESS')

| type                | data                          | purpose                          |
|---------------------|-------------------------------|----------------------------------|
| `RESTORE_PROGRESS`  | `{ history: [...], ... }`     | Restored progress from Firebase  |

---

## Examples by game type

### React game with state and history (e.g. quiz/vocabulary game)

```js
// Helper
function postToParent(event, data) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

// In game-end handler:
function handleGameEnd(result) {
  // ... existing logic (save to state/localStorage, show results)

  // A) Report best score
  const currentBest = stats?.bestScore || 0;
  const bestScore = Math.max(currentBest, result.score);
  postToParent('BEST_SCORE', { bestScore });

  // B) Send full history for persistence
  const updatedHistory = [...gameHistory, { ...result, id: Date.now(), date: new Date().toISOString() }];
  postToParent('GAME_STATS', { history: updatedHistory });
}

// In stats/data hook — on mount:
useEffect(() => {
  // Request saved progress
  postToParent('REQUEST_PROGRESS', undefined);

  function handleMessage(event) {
    const msg = event.data;
    if (msg?.type === 'RESTORE_PROGRESS' && msg.data) {
      // Merge remote data into local state
      setData(prev => {
        const merged = mergeData(prev, msg.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }
  }
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Vanilla JS game with localStorage (e.g. 2048)

```js
function postGameEvent(eventName, data) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event: eventName, data }, '*');
  }
}

// Score reporting:
if (currentScore > storedBestScore) {
  localStorage.setItem('bestScore', currentScore);
  postGameEvent('BEST_SCORE', { bestScore: currentScore });
}

// Progress persistence (if the game has settings/state to preserve):
postGameEvent('GAME_STATS', {
  bestScore: currentScore,
  totalGames: totalGames,
  // ... whatever the game tracks
});

// On page load — restore:
postGameEvent('REQUEST_PROGRESS', undefined);
window.addEventListener('message', function(e) {
  if (e.data?.type === 'RESTORE_PROGRESS' && e.data.data) {
    // Restore into localStorage / game state
    localStorage.setItem('bestScore', e.data.data.bestScore || 0);
  }
});
```

---

## Build note (React/Vite games)

After making these changes, the game needs to be rebuilt:
1. Make sure `vite.config.js` has `base: './'`
2. Run `pnpm run build` (or `npm run build`)
3. Copy the contents of `dist/` to the main project at:
   `public/games/<game-id>/`

## That's it

The parent app (GamePlayer.jsx) already handles:
- `BEST_SCORE` → saves to Firestore via `saveBestScore()`
- `GAME_STATS` → saves to Firestore via `saveGameStats()`
- `REQUEST_PROGRESS` → fetches from Firestore via `getGameStats()` and sends
  `RESTORE_PROGRESS` back to the iframe

You just need to wire up the game to send/receive these messages.
```
