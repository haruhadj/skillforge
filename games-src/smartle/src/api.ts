/**
 * Vocab/WordNet API client for Smartle.
 *
 * Talks to the WordNet-backed server at /api/vocab/* (same-origin: Next
 * rewrite in prod, Vite proxy in dev). Falls back gracefully — if the API
 * is unreachable the game still works with the bundled VALID_WORDS set.
 */

const BASE = '/api/vocab';

// In-memory caches so repeated word checks are instant
const validCache = new Map<string, boolean>();
const defCache = new Map<string, string | null>();

/**
 * Check if `word` exists in WordNet. Returns false on any network error.
 */
export async function validateWithWordNet(word: string): Promise<boolean> {
  const key = word.toUpperCase();
  if (validCache.has(key)) return validCache.get(key)!;
  try {
    const res = await fetch(
      `${BASE}/validate/${encodeURIComponent(word.toLowerCase())}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const valid = Boolean(data.success && data.valid);
    validCache.set(key, valid);
    return valid;
  } catch {
    return false;
  }
}

/**
 * Fetch the primary definition of `word` from WordNet.
 * Returns null if not found or API is unavailable.
 */
export async function fetchWordDefinition(word: string): Promise<string | null> {
  const key = word.toUpperCase();
  if (defCache.has(key)) return defCache.get(key)!;
  try {
    const res = await fetch(
      `${BASE}/word/${encodeURIComponent(word.toLowerCase())}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) { defCache.set(key, null); return null; }
    const data = await res.json();
    const def = typeof data.word?.definition === 'string' ? data.word.definition : null;
    defCache.set(key, def);
    return def;
  } catch {
    defCache.set(key, null);
    return null;
  }
}
