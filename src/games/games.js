/**
 * A simple registry of games available in the app.
 *
 * To add a new game:
 * 1) Add a new entry below.
 * 2) If the game is a static web app, set `iframePath` to the path under `public/`.
 * 3) If you want a different renderer (e.g. React component), update GamePlayer accordingly.
 */

export const defaultGames = [
  {
    id: '2048',
    name: '2048',
    iframePath: '/games/2048/index.html',
    description: 'Merge the tiles and reach the magic number. Addictive math at its best!',
  },
  {
    id: 'chess',
    name: 'Chess',
    iframePath: '/games/chess/index.html',
    description: 'The ultimate battle of wits. Protect your King and master the board.',
  },
  {
    id: 'geomaster',
    name: 'GeoMaster',
    iframePath: '/games/geomaster/index.html',
    description: 'Travel the globe from your screen. How well do you know our world?',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    iframePath: '/games/sudoku/index.html',
    description: 'Pure logic in every grid. Sharpen your mind one number at a time.',
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    iframePath: '/games/tictactoe/index.html',
    description: 'A quick classic for a reason. Simple, fast, and surprisingly competitive.',
  },
  {
    id: 'spelling-bee',
    name: 'Spelling Bee',
    iframePath: '/games/spelling-bee/index.html',
    description: 'Hunt for words and buzz your way to the top of the hive.',
  },
  {
    id: 'how-strong-is-your-vocabulary',
    name: 'How Strong Is Your Vocabulary',
    iframePath: '/games/how-strong-is-your-vocabulary/index.html',
    description: 'Put your word power to the test. Are you a true logophile?',
  },
  {
    id: 'math-game',
    name: 'Math Game',
    iframePath: '/games/math-game/index.html',
    description: 'Race against the clock to solve equations. Fast, fun, and educational.',
  },
  {
    id: 'chroma-memory',
    name: 'Chroma Memory',
    iframePath: '/games/chroma-memory/index.html',
    description: 'A vivid test of recall. Can you remember the sequence of colors?',
  },
  {
    id: 'color-memory',
    name: 'Color Memory',
    iframePath: '/games/color-memory/index.html',
    description: 'Match the shades and boost your brainpower with this colorful challenge.',
  },
  {
    id: 'jose-rizal',
    name: 'Jose Rizal',
    iframePath: '/games/jose-rizal/index.html',
    description: 'Step into history. Test your knowledge of the Philippine national hero.',
  },
];

/** Backward-compatible alias — existing code that imports { games } still works. */
export const games = defaultGames;

/**
 * Merge Firestore-stored games with the hardcoded defaults.
 * Firestore entries take precedence when the same id exists in both.
 * Games with `enabled === false` in Firestore are excluded.
 */
export function mergeGamesWithFirestore(firestoreGames = []) {
  const merged = new Map();

  // Seed with defaults
  for (const game of defaultGames) {
    merged.set(game.id, { ...game });
  }

  // Overlay Firestore entries
  for (const game of firestoreGames) {
    if (!game.id) continue;
    merged.set(game.id, { ...merged.get(game.id), ...game });
  }

  // Filter out disabled games and return
  return Array.from(merged.values()).filter((g) => g.enabled !== false);
}