import { Game } from '@/app/types'

/**
 * A simple registry of games available in the app.
 *
 * To add a new game:
 * 1) Add a new entry below.
 * 2) If the game is a static web app, set `iframePath` to the path under `public/`.
 * 3) If you want a different renderer (e.g. React component), update GamePlayer accordingly.
 */

export const defaultGames: Game[] = [
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
  {
    id: 'elemental-quest',
    name: 'Elemental Quest',
    iframePath: '/games/elemental-quest/index.html',
    description: 'Master the periodic table through speed and knowledge challenges. An interactive chemistry quiz.',
  },
  {
    id: 'math-blaster',
    name: 'Math Blaster: Cosmic Arithmetic',
    iframePath: '/games/math-blaster/index.html',
    description: 'A high-octane space-themed math game where speed and accuracy save the galaxy.',
  },
  {
    id: 'memory-matrix',
    name: 'Memory Matrix',
    iframePath: '/games/memory-matrix/index.html',
    description: 'Test your spatial recall by repeating increasingly complex patterns on a dynamic grid.',
  },
  {
    id: 'hangman-master',
    name: 'Hang in There!',
    iframePath: '/games/hangman-master/index.html',
    description: 'A polished Hangman game with difficulty levels, streaks, and a WordNet-powered vocabulary.',
  },
  {
    id: 'grammar-police',
    name: 'Grammar Police',
    iframePath: '/games/grammar-police/index.html',
    description: 'Spot grammatical errors in detective-themed sentences. Climb the ranks from Cadet to Commissioner!',
  },
  {
    id: 'vocabulary-wordle',
    name: 'Vocabulary Wordle',
    iframePath: '/games/vocabulary-wordle/index.html',
    description: 'Guess the 5-letter word in 6 tries. Powered by the WordNet dictionary with difficulty levels and vocabulary hints.',
  },
  {
    id: 'synonym-showdown',
    name: 'Synonym Showdown',
    iframePath: '/games/synonym-showdown/index.html',
    description: 'Rapid-fire synonym matching! Tap "same" or "different" for two words. Speed rounds, combo streaks, and leaderboard rankings.',
  },
  {
    id: 'fill-in-the-blank-relay',
    name: 'Fill-in-the-Blank Relay',
    iframePath: '/games/fill-in-the-blank-relay/index.html',
    description: 'Educational word game with sentence completion challenges. Progressive difficulty, dynamic relay timers, and combo streaks. Powered by WordNet vocabulary.',
  },
  {
    id: 'quordle',
    name: 'Quordle',
    iframePath: '/games/quordle/index.html',
    description: 'Can you solve 4 words at once? A challenging Wordle variant with 2x2 multi-board gameplay, streak multipliers, and coin economy. Powered by WordNet.',
  },
]

/** Backward-compatible alias — existing code that imports { games } still works. */
export const games = defaultGames

/**
 * Merge Firestore-stored games with the hardcoded defaults.
 * Firestore entries take precedence when the same id exists in both.
 * Games with `enabled === false` in Firestore are excluded.
 */
export function mergeGamesWithFirestore(firestoreGames: Partial<Game>[] = []): Game[] {
  const merged = new Map<string, Game>()

  // Seed with defaults
  for (const game of defaultGames) {
    merged.set(game.id, { ...game })
  }

  // Overlay Firestore entries
  for (const game of firestoreGames) {
    if (!game.id) continue
    const existing = merged.get(game.id)
    merged.set(game.id, { ...existing, ...game } as Game)
  }

  // Filter out disabled games and return
  return Array.from(merged.values()).filter((g) => g.enabled !== false)
}
