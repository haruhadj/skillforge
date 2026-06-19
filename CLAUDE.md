- my production is by docker hosted on my raspberry pi 5 (192.168.1.5), with nginx proxy manager `skillforge.haruhadj.org => 192.168.1.5:1234`, my domain `haruhadj.org`
- using pnpm runtime to lauch dev - (pnpm dev)
- always make sure the web ui are optimized for both dekstop and mobile devices responsivess
# Ruflo — Claude Code Configuration

## SkillForge — Project Architecture

Educational gaming platform: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4**, with Firebase for auth/data and a set of standalone Node game servers. Package manager: **pnpm**. Next build output goes to `dist/` (`distDir: 'dist'` in `next.config.js`).

### Frontend ↔ Firebase
- **Client SDK** (`app/lib/firebase.ts`): `auth`, `db`, `storage`, configured from `NEXT_PUBLIC_*` env vars. Used directly from the browser.
- **Admin SDK** (`app/lib/firebase-admin.ts`): lazy-initialized; used only inside API routes for privileged ops (password-reset link generation, account deletion).
- **Auth** (`app/contexts/AuthContext.tsx`): email/password + Google + Facebook popups. On every auth-state change it calls `ensureUserProfileDocument()` to self-heal missing Firestore profiles.
- **Firestore model** (`app/services/gameDataService.ts`): `users/{uid}/scores/{gameId}` (best score, write-if-higher) and `users/{uid}/gameStats/{gameId}` (weighted per-mode stats). Leaderboards are computed **client-side** via `collectionGroup` scans across all users + a composite scoring formula (skill 70% + diversity bonus + sqrt-experience). This reads every score/stat doc per call — a known scaling concern.

### Games
- ~21 games registered in `app/games/games.ts`; each runs as a **static iframe** under `public/games/<id>/`. These are pre-built artifacts (hashed Vite/Next bundles) — their source is NOT in this repo, so client-side game bugs can't be fixed here, only via env/config/proxy.
- The host ↔ iframe bridge is `app/play/[gameId]/PlayGameClient.tsx` using origin-checked `postMessage` (`PLAYER_INFO`, `GAME_EVENT`/`BEST_SCORE`/`GAME_STATS`, `REQUEST_PROGRESS`; special-cased: `jose-rizal`, `chroma-memory`, and `geoguessr-clone` which needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
- **Two score-write paths exist**: the client path (PlayGameClient → gameDataService) and a server route `app/api/games/score`. Confirm which is canonical before changing scoring.

### Game servers (`server/`, launched by `server/start-all.js`)
| Server | Type | Local port | Docker port |
|---|---|---|---|
| Chess | Socket.IO `/chess-ws/` | 3004 | 3004 |
| TicTacToe | Socket.IO `/tictactoe-ws/` | 3001 | 3005 |
| Chroma Memory | Socket.IO `/chroma-memory-ws/` | 3002 | 3002 |
| Spelling Bee | Express REST | 8787 | 8787 |
| Vocab | Express REST | 8788 | 8788 |

- **WordNet is a library, not a server**: `server/wordnet/service.js` wraps a 168 MB Open English WordNet SQLite via Node's built-in `node:sqlite` (Node 24+, read-only). Spelling Bee & Vocab dynamically `import()` it; Spelling Bee falls back to `data/wordBank.json`.
- TicTacToe local=3001 / prod=3005 is **intentional**, not a bug: the built client connects to `localhost:3001` on localhost and to same-origin `/tictactoe-ws/` otherwise (nginx proxies to `tictactoe:3005`).
- ⚠️ **Deployment gap**: `docker-compose.prod.yml` runs Next directly (port 1234→3000) with **no service for nginx and no Next rewrite for the `*-ws/` socket paths**. WebSocket routing in that compose depends on an external reverse proxy (`nginx/skillforge.conf`) that isn't wired in. `next.config.js` only rewrites `/api/*` → spelling-bee/vocab.

### Build & test
- `pnpm dev` = `next dev` + all game servers (concurrently). `pnpm build` = `next build`.
- `pnpm test` = `vitest run`, configured by `vitest.config.ts` (jsdom, `@`→root alias, setup in `tests/setup.ts`). Tests live in `tests/`.
- The old Vite stack (`vite.config.js`, root `index.html`, `src/`) was legacy/broken and has been removed; Tailwind v4 is driven via `@tailwindcss/postcss`.

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set (#2078). The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config
- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task | Agents | Topology |
|------|--------|----------|
| Bug Fix | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refactor | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Security | security-architect, auditor | hierarchical |

### When to Swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Haiku | Simple tasks, low complexity |
| 3 | Sonnet/Opus | Architecture, security, complex reasoning |

## Memory & Learning

### Before Any Task
```bash
npx @claude-flow/cli@latest memory search --query "[task keywords]" --namespace patterns
npx @claude-flow/cli@latest hooks route --task "[task description]"
```

### After Success
```bash
npx @claude-flow/cli@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category | Key Tools |
|----------|-----------|
| **Memory** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Bridge** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agents** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Security** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Background Workers

| Worker | When |
|--------|------|
| `audit` | After security changes |
| `optimize` | After performance work |
| `testgaps` | After adding features |
| `map` | Every 5+ file changes |
| `document` | After API changes |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
pnpm run build && pnpm test
```

## CLI Quick Reference

```bash
npx @claude-flow/cli@latest init --wizard           # Setup
npx @claude-flow/cli@latest swarm init --v3-mode     # Start swarm
npx @claude-flow/cli@latest memory search --query "" # Vector search
npx @claude-flow/cli@latest hooks route --task ""    # Route to agent
npx @claude-flow/cli@latest doctor --fix             # Diagnostics
npx @claude-flow/cli@latest security scan            # Security scan
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add claude-flow -- npx -y ruflo@latest mcp start
npx ruflo@latest doctor --fix
```

> The background `daemon` is optional. It runs interval workers that each spawn
> a headless `claude` session, so it consumes tokens continuously. Start it only
> if you want those sweeps: `npx ruflo@latest daemon start` (self-stops after 12h
> by default; `--ttl 0` to disable, `daemon status --all` to audit running daemons).

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash.
