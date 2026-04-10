import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.1.247',
      'skillforge.haruhadj.duckdns.org',
      '.ngrok-free.app',
      '.ngrok.app',
      '.trycloudflare.com',
      '2496-2001-4453-642-2600-840e-9b0b-6300-56ac.ngrok-free.app'
    ],
    proxy: {
      // Spelling Bee API — proxied so the iframe'd game can call /api/words, /api/tts
      '/api/words': 'http://localhost:8787',
      '/api/tts': 'http://localhost:8787',
      '/api/log-current-word': 'http://localhost:8787',
      // TicTacToe socket server
      '/tictactoe-ws/': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/chroma-memory-ws/': {
        target: 'http://localhost:3002',
        ws: true,
      },
      '/chess-ws/': {
        target: 'http://localhost:3004',
        ws: true,
      },
    },
  },
});
