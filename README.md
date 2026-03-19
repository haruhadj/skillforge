# SkillForge: A Web-Based Game Library

## Overview

SkillForge is a modern web application developed as part of a Computer Science thesis project. It serves as an interactive game library platform that allows users to access and play various classic games through a unified interface. The application features user authentication, a curated game collection, and a seamless gaming experience.

## Features

- **User Authentication**: Secure login and signup functionality powered by Firebase Authentication
- **Anonymous Access**: Play games without creating an account
- **Game Library**: Browse and select from a collection of popular games
- **Embedded Game Player**: Seamless integration of games using iframe technology
- **Responsive Design**: Built with Tailwind CSS for optimal viewing on all devices
- **Modern Tech Stack**: Developed using React, Vite, and Firebase for performance and scalability

## Games Included

- **2048**: The addictive number-sliding puzzle game
- **Chess**: Classic strategy board game with full gameplay
- **Sudoku**: Logic-based number placement puzzle

## Technologies Used

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Authentication
- **Language**: JavaScript (ES6+)
- **Package Manager**: pnpm

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- pnpm package manager
- Firebase project (for authentication)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/skillforge.git
   cd skillforge
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Email/Password provider
   - Copy your Firebase config to `src/firebase.js`

4. **Start the development server**
   ```bash
   pnpm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

## Usage

1. **Start Screen**: Choose to login, signup, or play anonymously
2. **Authentication**: Create an account or login with existing credentials
3. **Game Library**: Browse available games and select one to play
4. **Game Player**: Enjoy the selected game in the embedded player
5. **Navigation**: Use the back button to return to the library or logout

## Project Structure

```
skillforge/
├── public/
│   └── games/          # Embedded game files
│       ├── 2048/
│       ├── chess/
│       └── sudoku/
├── src/
│   ├── assets/         # Static assets
│   ├── components/     # React components
│   │   ├── GameLibrary.jsx
│   │   ├── GamePlayer.jsx
│   │   ├── LoginScreen.jsx
│   │   ├── SignupScreen.jsx
│   │   ├── SkillForge.jsx
│   │   └── StartScreen.jsx
│   ├── contexts/       # React contexts
│   │   └── AuthContext.jsx
│   ├── games/          # Game registry
│   │   └── games.js
│   ├── App.jsx         # Main app component
│   ├── firebase.js     # Firebase configuration
│   ├── index.css       # Global styles
│   └── main.jsx        # App entry point
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── README.md           # This file
```

## Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

### Adding New Games

To add a new game to the library:

1. Place the game files in `public/games/[game-id]/`
2. Add an entry to `src/games/games.js` with the game details
3. Ensure the game has an `index.html` file as the entry point

## Contributing

This project was developed as part of a Computer Science thesis. For academic or research purposes, please contact the author for collaboration opportunities.

## License

This project is developed for educational purposes as part of a thesis. Please refer to individual game licenses in their respective directories for usage rights.

## Author

Developed by [Your Name], Computer Science 4th Year Student

---

*Note: This README is part of the thesis documentation for SkillForge, demonstrating modern web development practices and game integration techniques.*
