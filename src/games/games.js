/**
 * A simple registry of games available in the app.
 *
 * To add a new game:
 * 1) Add a new entry below.
 * 2) If the game is a static web app, set `iframePath` to the path under `public/`.
 * 3) If you want a different renderer (e.g. React component), update GamePlayer accordingly.
 */

export const games = [
  {
    id: '2048',
    name: '2048',
    iframePath: '/games/2048/index.html',
  },
  {
    id: 'chess',
    name: 'Chess',
    iframePath: '/games/chess/index.html',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    iframePath: '/games/sudoku/index.html',
  },
]
