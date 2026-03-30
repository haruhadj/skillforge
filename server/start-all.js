import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Game servers to launch.
 * Add new entries here when you add a game that needs a backend.
 */
const servers = [
  {
    name: 'TicTacToe Socket',
    script: path.join(__dirname, 'games', 'tictactoe', 'socket-server.js'),
  },
  {
    name: 'Spelling Bee API',
    script: path.join(__dirname, 'games', 'spelling-bee', 'server.js'),
  },
]

console.log(`\n  Starting ${servers.length} game server(s)…\n`)

for (const { name, script } of servers) {
  const child = spawn('node', [script], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env },
  })

  child.on('error', (err) => {
    console.error(`[${name}] Failed to start: ${err.message}`)
  })

  child.on('exit', (code) => {
    console.log(`[${name}] Exited with code ${code}`)
  })
}
