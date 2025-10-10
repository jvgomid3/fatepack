#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(process.cwd())
const srcSvg = path.join(root, 'public', 'icons', 'app-icon.svg')
const outDir = path.join(root, 'public')

if (!fs.existsSync(srcSvg)) {
  console.error('SVG source not found:', srcSvg)
  process.exit(1)
}

const tasks = [
  { size: 120, file: 'apple-touch-icon-120x120.png' },
  { size: 152, file: 'apple-touch-icon-152x152.png' },
  { size: 167, file: 'apple-touch-icon-167x167.png' },
  { size: 180, file: 'apple-touch-icon-180x180.png' },
  { size: 180, file: 'apple-touch-icon.png' },
  { size: 192, file: 'app-icon-192.png' },
  { size: 512, file: 'app-icon-512.png' },
  { size: 512, file: 'placeholder-logo.png' }, // keep compatibility with current layout/usage
]

const svg = fs.readFileSync(srcSvg)

await Promise.all(tasks.map(async ({ size, file }) => {
  const out = path.join(outDir, file)
  await sharp(svg, { density: 384 }) // high density to keep lines crisp
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log('Wrote', file)
}))

console.log('All icons rendered successfully.')
