/**
 * Hamaru API client.
 *
 * Talks to the JMdict-backed game server at /api/hamaru/* (same-origin: Next
 * rewrite in dev, nginx in prod; a Vite dev proxy covers standalone dev).
 *
 * Every call returns `null` on any failure so callers can fall back to the
 * bundled static data in `../data` — the game must never break if the API is
 * unavailable or it is running fully offline.
 */

const BASE = '/api/hamaru';

export interface ApiWord {
  id: string;
  japanese: string;
  kana: string;
  kanji: string | null;
  romaji: string;
  english: string;
  components: string[];
  level: number;
}

export interface ApiQuizQuestion {
  id: string;
  prompt: string;
  promptRomaji: string | null;
  answer: string;
  romaji: string;
  options: string[];
}

export interface ApiMemoryPair {
  matchId: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.success === false) return null;
    return body as T;
  } catch {
    return null;
  }
}

/** Word Forge cards (kana split into mora blocks). */
export async function fetchWords(level = 1, count = 10, maxMora = 5): Promise<ApiWord[] | null> {
  const body = await getJson<{ words: ApiWord[] }>(
    `/words?level=${level}&count=${count}&maxMora=${maxMora}`,
  );
  return body?.words?.length ? body.words : null;
}

/** Multiple-choice translation quiz (Boss Battle / Bubble Pop). */
export async function fetchQuiz(
  level = 1,
  count = 10,
  reverse = false,
): Promise<ApiQuizQuestion[] | null> {
  const body = await getJson<{ questions: ApiQuizQuestion[] }>(
    `/quiz?level=${level}&count=${count}&reverse=${reverse}`,
  );
  return body?.questions?.length ? body.questions : null;
}

/** Japanese⇄English pairs (Elemental Card Match). */
export async function fetchMemoryPairs(level = 1, count = 6): Promise<ApiMemoryPair[] | null> {
  const body = await getJson<{ pairs: ApiMemoryPair[] }>(
    `/memory-pairs?level=${level}&count=${count}`,
  );
  return body?.pairs?.length ? body.pairs : null;
}
