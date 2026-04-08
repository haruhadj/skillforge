# SkillForge: A Web-Based Game Library

## Overview

SkillForge is a modern web application developed as part of a Computer Science thesis project. It serves as an interactive game library platform that allows users to access and play various educational and classic games through a unified interface. The application features user authentication, a curated game collection, score tracking and progress persistence, dark/light theme support, and backend servers for multiplayer and API-driven games.

## Features

- **User Authentication**: Secure login and signup functionality powered by Firebase Authentication (Email/Password and Google OAuth)
- **Anonymous Access**: Play games without creating an account
- **Game Library**: Browse and select from a collection of 7 games displayed in a responsive grid
- **Embedded Game Player**: Seamless integration of games using iframe technology with bidirectional messaging
- **Score Tracking**: Automatic best score saving and retrieval via Firebase Firestore
- **Progress Persistence**: Games can save and restore full game state across sessions
- **Statistics Page**: View best scores and last-played dates for all games
- **Dark/Light Theme**: Toggleable theme with persistence to local storage
- **Backend Servers**: WebSocket multiplayer support (Tic Tac Toe) and REST API (Spelling Bee)
- **Responsive Design**: Built with Tailwind CSS for optimal viewing on all devices
- **Modern Tech Stack**: React 19, Vite 7, Firebase, and Express

## Games Included

| Game | Description | Type |
|------|-------------|------|
| **2048** | The addictive number-sliding puzzle game | Static HTML/JS |
| **Chess** | Classic strategy board game with full gameplay | Static HTML/JS |
| **Sudoku** | Logic-based number placement puzzle | Static HTML/JS |
| **Tic Tac Toe** | Classic X and O game with WebSocket multiplayer | React + WebSocket Backend |
| **Spelling Bee** | Word puzzle game with text-to-speech support | React + REST API Backend |
| **How Strong Is Your Vocabulary** | Vocabulary strength assessment game | React |
| **Math Game** | Math challenge game | React |

## Technologies Used

### Frontend
- **Framework**: React 19.2
- **Build Tool**: Vite 7.3
- **Styling**: Tailwind CSS 4.2
- **Authentication & Database**: Firebase 12.10 (Auth, Firestore, Analytics)
- **Language**: JavaScript (ES6+)
- **Package Manager**: pnpm

### Backend
- **Runtime**: Node.js
- **API Framework**: Express 5.1
- **WebSocket**: Socket.IO 4.8
- **Text-to-Speech**: Google Cloud Text-to-Speech
- **Other**: CORS, express-rate-limit, node-cache, dotenv

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- pnpm package manager
- Firebase project (for authentication and Firestore)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/skillforge.git
   cd skillforge
   ```

2. **Install frontend dependencies**
   ```bash
   pnpm install
   ```

3. **Install server dependencies**
   ```bash
   cd server
   pnpm install
   cd ..
   ```

4. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Email/Password and Google providers
   - Enable Cloud Firestore
   - Copy your Firebase config to `src/firebase.js`

5. **Configure environment variables**
   - Create a `.env` file in the `server/` directory for any required API keys (e.g., Google Cloud TTS credentials for Spelling Bee)

6. **Start the development server**
   ```bash
   pnpm run dev
   ```
   This starts both the Vite dev server and all backend game servers concurrently.

7. **Open your browser**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

## Usage

1. **Start Screen**: Choose to login, sign up, or play anonymously
2. **Authentication**: Create an account or login with existing credentials
3. **Game Library**: Browse available games and select one to play
4. **Game Player**: Enjoy the selected game in the embedded player
5. **Statistics**: View your best scores and progress via the "My Stats" page
6. **Theme**: Toggle between dark and light mode using the theme switch
7. **Navigation**: Use the back button to return to the library or logout

## Project Structure

```
skillforge/
├── public/
│   └── games/                  # Embedded game files
│       ├── 2048/               # Static HTML/JS game
│       ├── chess/              # Static HTML/JS game
│       ├── sudoku/             # Static HTML/JS game
│       ├── tictactoe/          # React built game
│       ├── spelling-bee/       # React built game
│       ├── how-strong-is-your-vocabulary/  # React built game
│       └── math-game/          # React built game
├── server/
│   ├── start-all.js            # Launches all backend servers
│   ├── package.json            # Server dependencies
│   └── games/
│       ├── tictactoe/
│       │   └── socket-server.js    # WebSocket multiplayer server
│       └── spelling-bee/
│           └── server.js           # REST API server
├── scripts/
│   └── GAME_DATA_COLLECTION_PROMPT.md  # Iframe messaging protocol docs
├── src/
│   ├── assets/                 # Static assets
│   ├── components/             # React components
│   │   ├── GameLibrary.jsx     # Game selection grid
│   │   ├── GamePlayer.jsx      # Iframe player with messaging
│   │   ├── LoginScreen.jsx     # Email/password login
│   │   ├── SignupScreen.jsx    # Account registration
│   │   ├── SkillForge.jsx      # Main app controller
│   │   ├── StartScreen.jsx     # Landing page
│   │   ├── StatsPage.jsx       # User statistics dashboard
│   │   └── ThemeToggle.jsx     # Dark/light mode switch
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── ThemeContext.jsx    # Theme state with localStorage
│   ├── games/                  # Game registry
│   │   └── games.js            # Game definitions (all 7 games)
│   ├── services/
│   │   └── gameDataService.js  # Firestore score/progress API
│   ├── App.jsx                 # Root component (providers)
│   ├── firebase.js             # Firebase configuration
│   ├── index.css               # Global styles
│   └── main.jsx                # App entry point
├── ADDING_GAMES.md             # Guide for adding new games
├── package.json                # Frontend dependencies and scripts
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── README.md                   # This file
```

## Game–App Communication

Games communicate with the parent SkillForge app via `window.postMessage()`:

- **Score Reporting**: Games post a `GAME_EVENT` message with type `BEST_SCORE` when a game ends. The parent saves the score to Firestore.
- **Progress Save**: Games post a `GAME_EVENT` with type `GAME_STATS` to persist full game state (history, settings, etc.).
- **Progress Restore**: Games post `REQUEST_PROGRESS` on load; the parent responds with `RESTORE_PROGRESS` containing previously saved data.

All messages include a guard (`window.parent !== window`) so games function normally when opened standalone outside the iframe.

## Multiplayer Games

SkillForge supports real-time multiplayer via a Socket.IO WebSocket server. See [MULTIPLAYER.md](MULTIPLAYER.md) for the full guide covering architecture, room flow, socket events, LAN play, and how to add more multiplayer games.

## Development

### Available Scripts

- `pnpm run dev` - Start Vite dev server + all backend game servers (via concurrently)
- `pnpm run dev:client` - Start Vite dev server only
- `pnpm run dev:servers` - Start backend game servers only
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

### Adding New Games

See [ADDING_GAMES.md](ADDING_GAMES.md) for the full guide. In summary:

**Static HTML/JS Games:**
1. Copy game folder to `public/games/<game-id>/`
2. Register in `src/games/games.js`

**React/Vite Games:**
1. Set `base: './'` in the game's `vite.config.js`
2. Build and copy `dist/` contents to `public/games/<game-id>/`
3. Register in `src/games/games.js`

**Games with a Backend:**
1. Copy built frontend to `public/games/<game-id>/`
2. Copy server code to `server/games/<game-id>/`
3. Register the server in `server/start-all.js`
4. Add Vite proxy rules or configure direct WebSocket connections

## Contributing

This project was developed as part of a Computer Science thesis. For academic or research purposes, please contact the author for collaboration opportunities.

## License

This project is developed for educational purposes as part of a thesis. Please refer to individual game licenses in their respective directories for usage rights.

## Author

Developed by [Your Name], Computer Science 4th Year Student

---

*Note: This README is part of the thesis documentation for SkillForge, demonstrating modern web development practices and game integration techniques.*
