import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const publicDirectory = path.resolve(scriptDirectory, '../public')
const heroPath = path.join(publicDirectory, 'images/hero-conversation.png')
const logoPath = path.join(publicDirectory, 'logos/black-text-logo.svg')
const outputPath = path.join(publicDirectory, 'og-image-v2.png')

const [hero, logoSource] = await Promise.all([
  sharp(heroPath).resize(500, 630, { fit: 'cover', position: 'centre' }).png().toBuffer(),
  readFile(logoPath),
])

const logo = await sharp(logoSource).resize({ width: 186 }).png().toBuffer()

const canvas = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f9f7f1"/>
    <rect x="68" y="244" width="446" height="40" rx="3" fill="#c8f43f"/>
    <text x="68" y="190" fill="#121931" font-family="Georgia, serif" font-size="62" font-weight="600" letter-spacing="-2.7">
      <tspan x="68" dy="0">A clearer next move</tspan>
      <tspan x="68" dy="74">starts with a real</tspan>
      <tspan x="68" dy="74">question.</tspan>
    </text>
    <text x="68" y="474" fill="#4e5569" font-family="Arial, sans-serif" font-size="24">
      Talk it through with someone who has been there.
    </text>
    <rect x="68" y="537" width="86" height="8" rx="4" fill="#2840e2"/>
    <rect x="690" width="10" height="630" fill="#2840e2"/>
  </svg>
`)

await sharp(canvas)
  .composite([
    { input: hero, left: 700, top: 0 },
    { input: logo, left: 68, top: 62 },
  ])
  .png({ compressionLevel: 9, palette: true })
  .toFile(outputPath)

console.log(outputPath)
