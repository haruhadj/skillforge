import { defineConfig } from 'vitest/config'
import path from 'path'

// Vitest configuration for the SkillForge Next.js app.
// The `@/*` alias mirrors tsconfig.json so tests can import app modules
// the same way the application code does.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
})
