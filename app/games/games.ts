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
    id: 'chrono-sense',
    name: 'Chrono Sense',
    iframePath: '/games/chrono-sense/index.html',
    description: 'Test your internal clock — hold and release at the exact target time.',
    category: 'Memory',
  },
  {
    id: '2048',
    name: '2048',
    iframePath: '/games/2048/index.html',
    description: 'Merge the tiles and reach the magic number. Addictive math at its best!',
    category: 'Math',
  },
  {
    id: 'chess',
    name: 'Chess',
    iframePath: '/games/chess/index.html',
    description: 'The ultimate battle of wits. Protect your King and master the board.',
    category: 'Logic',
  },
  {
    id: 'geomaster',
    name: 'GeoMaster',
    iframePath: '/games/geomaster/index.html',
    description: 'Travel the globe from your screen. How well do you know our world?',
    category: 'Geography',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    iframePath: '/games/sudoku/index.html',
    description: 'Pure logic in every grid. Sharpen your mind one number at a time.',
    category: 'Logic',
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    iframePath: '/games/tictactoe/index.html',
    description: 'A quick classic for a reason. Simple, fast, and surprisingly competitive.',
    category: 'Logic',
  },
  {
    id: 'spelling-bee',
    name: 'Spelling Bee',
    iframePath: '/games/spelling-bee/index.html',
    description: 'Hunt for words and buzz your way to the top of the hive.',
    category: 'Language',
  },
  {
    id: 'how-strong-is-your-vocabulary',
    name: 'How Strong Is Your Vocabulary',
    iframePath: '/games/how-strong-is-your-vocabulary/index.html',
    description: 'Put your word power to the test. Are you a true logophile?',
    category: 'Language',
  },
  {
    id: 'math-game',
    name: 'Math Game',
    iframePath: '/games/math-game/index.html',
    description: 'Race against the clock to solve equations. Fast, fun, and educational.',
    category: 'Math',
  },
  {
    id: 'chroma-memory',
    name: 'Chroma Memory',
    iframePath: '/games/chroma-memory/index.html',
    description: 'A vivid test of recall. Can you remember the sequence of colors?',
    category: 'Memory',
  },
  {
    id: 'color-memory',
    name: 'Color Memory',
    iframePath: '/games/color-memory/index.html',
    description: 'Match the shades and boost your brainpower with this colorful challenge.',
    category: 'Memory',
  },
  {
    id: 'jose-rizal',
    name: 'Jose Rizal',
    iframePath: '/games/jose-rizal/index.html',
    description: 'Step into history. Test your knowledge of the Philippine national hero.',
    category: 'History',
  },
  {
    id: 'elemental-quest',
    name: 'Elemental Quest',
    iframePath: '/games/elemental-quest/index.html',
    description: 'Master the periodic table through speed and knowledge challenges. An interactive chemistry quiz.',
    category: 'Science',
  },
  {
    id: 'math-blaster',
    name: 'Math Blaster: Cosmic Arithmetic',
    iframePath: '/games/math-blaster/index.html',
    description: 'A high-octane space-themed math game where speed and accuracy save the galaxy.',
    category: 'Math',
  },
  {
    id: 'memory-matrix',
    name: 'Memory Matrix',
    iframePath: '/games/memory-matrix/index.html',
    description: 'Test your spatial recall by repeating increasingly complex patterns on a dynamic grid.',
    category: 'Memory',
  },
  {
    id: 'hangman-master',
    name: 'Hang in There!',
    iframePath: '/games/hangman-master/index.html',
    description: 'A polished Hangman game with difficulty levels, streaks, and a WordNet-powered vocabulary.',
    category: 'Language',
  },
  {
    id: 'grammar-police',
    name: 'Grammar Police',
    iframePath: '/games/grammar-police/index.html',
    description: 'Spot grammatical errors in detective-themed sentences. Climb the ranks from Cadet to Commissioner!',
    category: 'Language',
  },
  {
    id: 'vocabulary-wordle',
    name: 'Vocabulary Wordle',
    iframePath: '/games/vocabulary-wordle/index.html',
    description: 'Guess the 5-letter word in 6 tries. Powered by the WordNet dictionary with difficulty levels and vocabulary hints.',
    category: 'Language',
  },
  {
    id: 'synonym-showdown',
    name: 'Synonym Showdown',
    iframePath: '/games/synonym-showdown/index.html',
    description: 'Rapid-fire synonym matching! Tap "same" or "different" for two words. Speed rounds, combo streaks, and leaderboard rankings.',
    category: 'Language',
  },
  {
    id: 'fill-in-the-blank-relay',
    name: 'Fill-in-the-Blank Relay',
    iframePath: '/games/fill-in-the-blank-relay/index.html',
    description: 'Educational word game with sentence completion challenges. Progressive difficulty, dynamic relay timers, and combo streaks. Powered by WordNet vocabulary.',
    category: 'Language',
  },
  {
    id: 'quordle',
    name: 'Quordle',
    iframePath: '/games/quordle/index.html',
    description: 'Can you solve 4 words at once? A challenging Wordle variant with 2x2 multi-board gameplay, streak multipliers, and coin economy. Powered by WordNet.',
    category: 'Language',
  },
  {
    id: 'geoguessr-clone',
    name: 'GeoGuessr Clone',
    iframePath: '/games/geoguessr-clone/index.html',
    description: 'A self-hosted GeoGuessr clone featuring Google Street View panoramas and an interactive 2D guessing map. Guess your location from street view clues.',
    category: 'Geography',
  },
  {
    id: 'math-nerdle',
    name: 'Math Nerdle',
    iframePath: '/games/math-nerdle/index.html',
    description: 'An 8-character math equation wordle clone. Guess the correct evaluation using numbers and standard operations.',
    category: 'Math',
  },
  {
    id: 'philippine-trivia',
    name: 'The Philippine Trivia',
    iframePath: '/games/philippine-trivia/index.html',
    description: 'Test your knowledge of Philippine history, geography, culture, and heroes across 11 themed quizzes.',
    category: 'History',
    difficulty: 'medium',
  },
  {
    id: 'make-24-precision',
    name: 'Make 24',
    iframePath: '/games/make-24-precision/index.html',
    description: 'Combine four number tiles with +, −, ×, and ÷ to make exactly 24. Exact fraction math (no rounding), streaks, an algorithmic hint solver, and custom decks.',
    category: 'Math',
  },
  {
    id: 'code-quest',
    name: 'Code Quest',
    iframePath: '/games/code-quest/index.html',
    description: 'Guide a robot through grid puzzles using visual logic blocks. Learn sequencing, loops, conditionals, and subroutines — core CS concepts made fun.',
    category: 'Logic',
  },
  {
    id: 'hamaru',
    name: 'Hamaru (ハマル)',
    iframePath: '/games/hamaru/index.html',
    description: 'Get hooked on Japanese! Four arcade minigames — Boss Battle, Elemental Card Match, Word Forge, and Particle Bubble Pop — powered by a 22k-word JMdict vocabulary engine.',
    category: 'Language',
  },
  {
    id: 'shape-recall',
    name: 'Shape Recall',
    iframePath: '/games/shape-recall/index.html',
    description: 'Memorize a shape\'s position and size in 3 seconds, then drag and resize it back with maximum precision. A high-contrast spatial recall challenge across 5 rounds.',
    category: 'Memory',
  },
  {
    id: 'dialed-sound',
    name: 'Dialed Sound',
    iframePath: '/games/dialed-sound/index.html',
    description: 'Hear a target pitch, then drag a tactile slider to recreate it exactly. Score up to 10 points per round across 5 rounds — precision under 2 cents earns a perfect match.',
    category: 'Music',
  },
  {
    id: 'merge-2048',
    name: 'Merge 2048',
    iframePath: '/games/merge-2048/index.html',
    description: 'Drop and merge numbered blocks in a physics-powered container. Combine matching values to reach 2048, and play in Classic or Shape Mode.',
    category: 'Math',
  },
  {
    id: 'smartle',
    name: 'Smartle',
    iframePath: '/games/smartle/index.html',
    description: 'Rearrange a scrambled 5×5 letter grid until every row spells a valid word. Daily puzzles, a timed Sprint marathon, and a full Archive. Powered by WordNet for definitions.',
    category: 'Language',
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
