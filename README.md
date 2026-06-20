# SkillForge

An educational gaming platform where users log in, play skill-based games, and track their progress over time. Built with Next.js and Firebase, self-hosted on a Raspberry Pi 5.

## Features

- 20+ embedded games across math, memory, geography, language, and strategy
- Per-game score tracking and personal best history
- Global leaderboard with a composite skill scoring formula
- Multiplayer support for Chess, Tic Tac Toe, and Chroma Memory via Socket.IO
- Google, Facebook, and email/password authentication
- Admin dashboard for user management

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth & Database | Firebase 12 (Auth + Firestore + Storage) |
| Real-time | Socket.IO (Chess, Tic Tac Toe, Chroma Memory) |
| Package manager | pnpm |
| Runtime | Node.js 24 |

## Getting Started

**Prerequisites:** Node.js 22+, pnpm

```bash
# Clone and install
git clone https://github.com/haruhadj/skillforge.git
cd skillforge
pnpm install

# Set up environment variables
cp .env.example .env.local   # then fill in your Firebase config

# Start development server (Next.js + all game servers)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # required for GeoMaster
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For the backend game servers, create `server/.env`:

```env
WORDSAPI_KEY=      # RapidAPI key for Spelling Bee word validation
CHESS_PORT=3004
TICTACTOE_PORT=3001
```

## Scripts

```bash
pnpm dev           # Next.js dev server + all game servers
pnpm dev:client    # Next.js only
pnpm dev:servers   # Game servers only
pnpm build         # Production build
pnpm start         # Start production server
pnpm test          # Run tests (Vitest)
pnpm lint          # ESLint
```

## Project Structure

```
app/                        # Next.js App Router
  games/games.ts            # Game registry — source of truth for all games
  play/[gameId]/            # Game iframe host + postMessage bridge
  services/                 # Firestore data access (scores, stats, profiles)
  contexts/                 # Auth and theme providers
  lib/firebase.ts           # Firebase client init
  lib/firebase-admin.ts     # Firebase Admin SDK (API routes only)

public/games/               # Pre-built game bundles (served as static files)
  2048/ chess/ sudoku/ ...

server/                     # Standalone Node.js game servers
  games/chess/              # Socket.IO — port 3004
  games/tictactoe/          # Socket.IO — port 3001 (dev) / 3005 (prod)
  games/chroma-memory/      # Socket.IO
  games/spelling-bee/       # Express REST — port 8787
  games/vocab/              # Express REST — port 8788
  wordnet/service.js        # Open English WordNet via SQLite (Node 24+)
  start-all.js              # Starts all servers concurrently

docs/                       # Extended documentation
```

## Games

| Game | Score Tracking | Multiplayer |
|---|---|---|
| 2048 | Best score + history | — |
| Chess | Match stats | Socket.IO |
| Tic Tac Toe | Match stats | Socket.IO |
| Chroma Memory | Accuracy per mode | Socket.IO |
| GeoMaster | Best score + history | — |
| Spelling Bee | Word history | — |
| Vocabulary | Score history | — |
| Math Game | Best score + history | — |
| Color Memory | Best score + history | — |
| Sudoku | Match stats | — |
| Jose Rizal Quiz | Best score | — |
| + 10 more | | |

## Deployment

The production stack runs on a Raspberry Pi 5 via Docker Compose, proxied through Nginx Proxy Manager.

```bash
# Build and push images to GHCR (CI handles this automatically on push to main)
# Pull and run on the Pi:
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

See [docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md) for the full setup guide including Nginx Proxy Manager configuration.

### CI/CD

GitHub Actions builds and pushes `linux/arm64` Docker images to GHCR on every push to `main` (excluding `.md` and `docs/` changes). The Pi pulls the new images on deploy — it never compiles code locally.

## Documentation

| Doc | Description |
|---|---|
| [docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md) | Production deployment on Raspberry Pi |
| [docs/ADDING_GAMES.md](docs/ADDING_GAMES.md) | How to add a new game |
| [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md) | Socket.IO room flow and events reference |
| [docs/SCORING_SYSTEM_GUIDE.md](docs/SCORING_SYSTEM_GUIDE.md) | Leaderboard scoring formula |
| [docs/WORDNET_API_GUIDE.md](docs/WORDNET_API_GUIDE.md) | WordNet / Spelling Bee API |
