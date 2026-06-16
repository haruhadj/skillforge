import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// Flat ESLint config for the Next.js app. Next 16 removed `next lint` and ships
// `eslint-config-next` as flat config arrays, so we compose them directly here.
// Replaces the legacy Vite-era config. Run with `npm run lint` (`eslint .`).
export default defineConfig([
  globalIgnores([
    'dist/**', // Next build output (distDir: 'dist')
    '.next/**',
    'public/**', // pre-built, minified game bundles
    'server/**', // standalone Node game servers — separate lint surface
    '.claude/**', // ruflo/claude-flow tooling helpers — not app source
    'node_modules/**',
    'next-env.d.ts',
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
])
