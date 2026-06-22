# Spelling Bee (React + Vite)

This is a Spelling Bee game built with React + Vite.

## WordsAPI (safe server proxy)

This project uses a **local server proxy** so your RapidAPI / WordsAPI key never ships to the browser.

### Setup

- Copy `.env.example` to `.env`
- Put your key in `.env`:

```
WORDSAPI_KEY=YOUR_RAPIDAPI_KEY
```

### Run

```
pnpm install
pnpm dev
```

- The React app runs on Vite (dev)
- The proxy server runs on `http://localhost:8787`
- The frontend calls `/api/words` (Vite proxies it to the server)

### Health check

- `http://localhost:8787/api/health` should return `hasWordsApiKey: true` when configured.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
