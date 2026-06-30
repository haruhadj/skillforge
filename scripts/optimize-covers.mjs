#!/usr/bin/env node
/**
 * Generate WebP variants of every game cover (public/games/<id>/cover.png -> cover.webp).
 *
 * The <GameCover> component serves the .webp to capable browsers and falls back to the
 * .png otherwise, so the generated .webp files are committed alongside the PNGs and the
 * Docker image picks them up from public/ unchanged. (audit R17 — WebP covers)
 *
 * Tooling: prefers the `sharp` library if it resolves; otherwise shells out to the
 * ImageMagick `magick`/`convert` CLI (both produce equivalent WebP). Run with:
 *   npm run covers:optimize
 */
import { readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const GAMES_DIR = join(ROOT, 'public', 'games')
const MAX_WIDTH = 768 // covers never render wider than this; cap to crush oversized art
const QUALITY = 80

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`
}

// Resolve a converter: sharp first, then ImageMagick (magick, then convert).
async function resolveConverter() {
  try {
    const sharp = (await import('sharp')).default
    return {
      name: 'sharp',
      convert: (src, dest) =>
        sharp(src).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(dest),
    }
  } catch {
    /* sharp not installed — fall through to ImageMagick */
  }

  for (const bin of ['magick', 'convert']) {
    try {
      execFileSync(bin, ['-version'], { stdio: 'ignore' })
      return {
        name: bin,
        convert: (src, dest) =>
          execFileSync(bin, [src, '-resize', `${MAX_WIDTH}x>`, '-quality', String(QUALITY), dest], {
            stdio: 'ignore',
          }),
      }
    } catch {
      /* try next */
    }
  }
  return null
}

async function main() {
  const converter = await resolveConverter()
  if (!converter) {
    console.error('No image converter found. Install `sharp` (npm i -D sharp) or ImageMagick.')
    process.exit(1)
  }
  console.log(`Optimizing covers with: ${converter.name}\n`)

  const gameIds = readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  let converted = 0
  let beforeTotal = 0
  let afterTotal = 0

  for (const id of gameIds) {
    const src = join(GAMES_DIR, id, 'cover.png')
    const dest = join(GAMES_DIR, id, 'cover.webp')
    if (!existsSync(src)) continue

    await converter.convert(src, dest)
    const before = statSync(src).size
    const after = statSync(dest).size
    beforeTotal += before
    afterTotal += after
    converted++
    const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0
    console.log(`  ${id.padEnd(28)} ${fmtKB(before).padStart(7)} -> ${fmtKB(after).padStart(7)}  (-${pct}%)`)
  }

  const pctTotal = beforeTotal > 0 ? Math.round((1 - afterTotal / beforeTotal) * 100) : 0
  console.log(
    `\n${converted} covers: ${fmtKB(beforeTotal)} PNG -> ${fmtKB(afterTotal)} WebP  (-${pctTotal}% total)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
