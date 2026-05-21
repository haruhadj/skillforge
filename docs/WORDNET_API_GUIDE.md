# SkillForge WordNet API Guide for AI Coding Agents

## Overview

SkillForge uses the **Open English WordNet (OEWN)** SQLite database to provide vocabulary words for educational games. The WordNet service is built into the SkillForge backend and provides synchronous, high-performance word queries without external API dependencies.

**Key Facts:**
- **Database**: `oewn-2025-sqlite-2.3.2.sqlite` (152,459+ words)
- **Location**: `server/wordnet/oewn-2025-sqlite-2.3.2.sqlite`
- **Module**: `server/wordnet/service.js` (Node.js 24+ built-in `node:sqlite`)
- **Server Port**: 8788 (`/api/vocab/*` — used by Vocab game and Hangman Master)
- **Spelling Bee**: port 8787, uses **WordNet as primary source** with static `wordBank.json` as fallback
- **Difficulty**: Based on word frequency (tagcount in senses table)

---

## API Endpoints

### 1. Health Check
```
GET /api/vocab/health
```
**Response:**
```json
{
  "ok": true,
  "service": "vocab",
  "timestamp": "2026-05-20T12:00:00.000Z"
}
```

### 2. Get Words with Quiz Questions (Vocab Game)
```
GET /api/vocab/words?difficulty={level}&count={number}
```

**Parameters:**
- `difficulty`: `light` | `medium` | `hard` | `devilish`
- `count`: 1-25 (number of questions)

**Response:**
```json
{
  "success": true,
  "difficulty": "medium",
  "count": 10,
  "questions": [
    {
      "word": "position",
      "partOfSpeech": "noun",
      "correctDefinition": "the particular portion of space occupied by something",
      "correctIndex": 2,
      "options": [
        "the whole amount",
        "declare formally; declare someone to be something",
        "the particular portion of space occupied by something",
        "impose a penalty on; inflict punishment on"
      ],
      "topic": "noun.location"
    }
  ]
}
```

### 3. Spelling Bee Words
```
GET /api/words?difficulty={level}&limit={number}&partOfSpeech={filter}
```

Served by the **spelling-bee server (port 8787)**. Uses **WordNet as the primary source**;
falls back to `server/games/spelling-bee/data/wordBank.json` (~160 curated words) if
WordNet is unavailable.

**Parameters:**
- `difficulty`: `easy` | `medium` | `hard`
- `limit`: 1-25
- `partOfSpeech` (optional): comma-separated list (`noun,verb,adjective,adverb`)
- `topic` (optional): comma-separated domain filters

**Response:**
```json
{
  "words": [
    {
      "word": "ship",
      "definition": "a vessel that carries passengers or freight",
      "partOfSpeech": "noun",
      "topic": "noun.artifact",
      "freq": 49,
      "example": "This is a ship."
    }
  ],
  "source": "wordnet"
}
```

When WordNet is unavailable, `source` will be `"local"` and words come from the static word bank.

```json
{
  "words": [ ... ],
  "source": "local"
}
```

### 4. Validate a Word
```
GET /api/vocab/validate/{word}
```

**Response:**
```json
{
  "valid": true,
  "word": "example"
}
```

### 5. Get Word Details
```
GET /api/vocab/word/{word}
```

**Response:**
```json
{
  "success": true,
  "word": {
    "word": "example",
    "definition": "an item of information that is typical of a class or group",
    "partOfSpeech": "noun",
    "topic": "noun.communication",
    "freq": 20
  }
}
```

> ⚠️ The word data is nested inside a `word` object. Always access `data.word.word`, `data.word.definition`, etc.

### 6. Get Database Stats
```
GET /api/vocab/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalWords": 152459,
    "totalSynsets": 117000,
    "wordsWithFrequency": 35207,
    "byDifficulty": {
      "light": 1953,
      "medium": 2277,
      "hard": 6338,
      "devilish": 16315
    },
    "databasePath": "server/wordnet/oewn-2025-sqlite-2.3.2.sqlite"
  }
}
```

---

## Database Schema Reference

### Key Tables:

| Table | Purpose | Key Columns |
|-------|---------|---------------|
| `words` | All words | `wordid`, `word` |
| `synsets` | Synonym sets (definitions) | `synsetid`, `posid`, `domainid`, `definition` |
| `senses` | Links words to definitions | `senseid`, `synsetid`, `wordid`, `tagcount` |
| `poses` | Parts of speech | `posid` ('n', 'v', 'a', 'r'), `pos` ('noun', 'verb', etc.) |
| `domains` | Topic categories | `domainid`, `domainname` (e.g., 'noun.artifact') |

### POS ID Mapping:
- `n` → noun
- `v` → verb
- `a` → adjective
- `r` → adverb

### Difficulty Mapping (tagcount ranges):
| Level | Range | Description |
|-------|-------|-------------|
| `light` / `easy` | 15+ | Common everyday words |
| `medium` | 8-14 | Moderate frequency |
| `hard` | 3-7 | Less common |
| `devilish` | 0-2 | Rare/obscure words |

---

## Client Integration Pattern

### React/Frontend Example:

```javascript
// src/data/api.js
const API_BASE_URL = import.meta.env.DEV 
  ? '/api/vocab'  // Vite proxy
  : (import.meta.env.VITE_SKILLFORGE_API_URL || 'http://localhost:8788');

export async function fetchWords(difficulty, count = 10) {
  try {
    const url = import.meta.env.DEV
      ? `${API_BASE_URL}/words?difficulty=${difficulty}&count=${count}`
      : `${API_BASE_URL}/api/vocab/words?difficulty=${difficulty}&count=${count}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    return data.success ? data.questions : null;
  } catch (err) {
    console.warn('[WordNet] API failed:', err.message);
    return null; // Return null to trigger fallback
  }
}
```

### Async Loading Pattern:

```javascript
// In game component
const [questions, setQuestions] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState(null);

useEffect(() => {
  async function loadWords() {
    setIsLoading(true);
    
    // Try WordNet API first
    const apiWords = await fetchWords(difficulty, 10);
    
    if (apiWords && apiWords.length > 0) {
      setQuestions(apiWords);
    } else {
      // Fallback to local word bank
      setQuestions(fallbackWords[difficulty]);
    }
    
    setIsLoading(false);
  }
  
  loadWords();
}, [difficulty]);
```

---

## Vite Configuration (Development)

Add proxy to `vite.config.js`:

```javascript
export default defineConfig({
  // ... other config
  server: {
    proxy: {
      '/api/vocab': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
      '/api/words': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Environment Variables

Create `.env` file:

```
# SkillForge API URL for WordNet queries
# Local development: http://localhost:8788 (vocab) or 8787 (spelling bee)
# Production: https://skillforge.haruhadj.duckdns.org
VITE_SKILLFORGE_API_URL=http://localhost:8788
```

---

## Error Handling Best Practices

1. **Always implement fallback**: WordNet queries may fail (DB not found, etc.)
2. **Show loading states**: DB queries take 50-200ms
3. **Handle empty results**: Filtered queries may return 0 results
4. **Cache responses**: Use React Query, SWR, or simple state for repeated requests
5. **Retry logic**: Implement exponential backoff for transient failures

### Example Error Handling:

```javascript
async function getWordsWithFallback(difficulty, count) {
  // Try WordNet
  try {
    const words = await fetchWords(difficulty, count);
    if (words && words.length >= count * 0.8) {
      return { words, source: 'wordnet' };
    }
  } catch (err) {
    console.warn('WordNet failed:', err);
  }
  
  // Fallback to local
  return { 
    words: fallbackBank[difficulty].slice(0, count),
    source: 'fallback'
  };
}
```

---

## Game-Specific Integration Notes

### For Vocabulary/Multiple-Choice Games:
- Use `/api/vocab/words` endpoint
- Returns questions with pre-generated distractors
- Each question has 4 options with 1 correct answer
- `correctIndex` tells you which option is correct

### For Spelling Games:
- Use `/api/words` endpoint (spelling bee server)
- Returns words with definitions and optional examples
- Filter by `partOfSpeech` to focus on specific word types
- Use `topic` filter for themed rounds (e.g., only "noun.animal")

### For Word Guessing Games (e.g. Hangman Master):
- Use `/api/vocab/words` to fetch words with definitions as hints
- Use `/api/vocab/word/{word}` to retrieve full definition after round ends
- Use `/api/vocab/validate/{word}` for quick existence check
- The game's `wordnet.ts` service client (`src/services/wordnet.ts`) handles caching in a memory pool and falls back to local constants on API failure

---

## Performance Considerations

- **Synchronous queries**: The WordNet service uses `DatabaseSync` for speed
- **No network latency**: Local SQLite queries are fast (< 100ms)
- **Caching**: Results are not cached by default - implement client-side caching if needed
- **Concurrent access**: SQLite handles multiple readers well

---

## Testing the API

```bash
# Health check
curl http://localhost:8788/api/vocab/health

# Get 5 medium difficulty questions
curl "http://localhost:8788/api/vocab/words?difficulty=medium&count=5"

# Get spelling words (nouns only)
curl "http://localhost:8787/api/words?difficulty=hard&limit=5&partOfSpeech=noun"

# Validate a word
curl http://localhost:8788/api/vocab/validate/hello

# Get stats
curl http://localhost:8788/api/vocab/stats
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "no such column" error | Check DB schema matches expected columns |
| Empty results | Verify difficulty mapping matches tagcount ranges |
| DB path errors | Ensure `oewn-2025-sqlite-2.3.2.sqlite` exists in `server/wordnet/` |
| CORS errors | Add Vite proxy or configure CORS on server |
| Slow queries | Check if DB is on SSD; consider client caching |

---

## Files Reference

| File | Purpose |
|------|---------|
| `server/wordnet/service.js` | Core WordNet service module |
| `server/wordnet/oewn-2025-sqlite-2.3.2.sqlite` | WordNet database |
| `server/games/vocab/server.js` | Vocab game API server (port 8788) |
| `server/games/spelling-bee/server.js` | Spelling bee API server (port 8787) |
| `server/package.json` | Server dependencies |

---

## Next.js Rewrite Configuration

The SkillForge Next.js frontend proxies API requests via `next.config.js`. The `/api/vocab/*`
rewrite **must be listed before** the catch-all `/api/*` rewrite or vocab requests will
mistakenly hit the spelling-bee server (port 8787).

```js
// next.config.js
async rewrites() {
  return [
    // Vocab / Hangman WordNet API (port 8788) — MUST be first
    { source: '/api/vocab/:path*', destination: 'http://localhost:8788/api/vocab/:path*' },
    // Spelling Bee API (port 8787)
    { source: '/api/:path*',       destination: 'http://localhost:8787/api/:path*' },
  ]
}
```

Set `VOCAB_API_ORIGIN` in `.env` to override the default for production:
```
VOCAB_API_ORIGIN=https://skillforge.haruhadj.duckdns.org
```

---

## Games Using WordNet

| Game | Server | Endpoints Used |
|------|--------|----------------|
| How Strong Is Your Vocab | Port 8788 | `/api/vocab/words`, `/api/vocab/health` |
| Hangman Master | Port 8788 | `/api/vocab/health`, `/api/vocab/words`, `/api/vocab/word/:word` |
| Spelling Bee | Port 8787 | `/api/words` *(WordNet primary, word bank fallback)* |

---

## Summary for AI Agents

When building a new SkillForge game that needs vocabulary words:

1. **Import the API client** or create a fetch wrapper pointing to `/api/vocab`
2. **Call the appropriate endpoint** for your game type
3. **Always implement fallback** to a local word bank constant
4. **Show loading states** while fetching
5. **Handle errors gracefully** — check health first, then fall back silently
6. **In development**: Next.js proxy handles routing automatically (just use `/api/vocab/*`)
7. **Word details response is nested**: access `data.word.definition`, not `data.definition`

The WordNet integration eliminates external API dependencies and provides 152K+ words across all difficulty levels.
