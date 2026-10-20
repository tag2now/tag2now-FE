// Renders public/app-icon.png down to the sizes the web manifest lists.
//
// The manifest needs 192 and 512 for installability, and the Android app
// (Bubblewrap) builds its launcher icons from the 512. The source fills its
// square edge to edge with the logo inside the central 80% circle, so the 512
// doubles as the maskable icon. Chromium comes from the Playwright install the
// E2E suite already depends on - no new dependency.
//
//   node scripts/generate-app-icons.mjs
//
// Re-run whenever app-icon.png changes, and commit the PNGs.
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const source = readFileSync(resolve(publicDir, 'app-icon.png')).toString('base64')

const SIZES = [192, 512]

const browser = await chromium.launch()
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(
    `<style>html,body{margin:0}img{display:block;width:100vw;height:100vh}</style>` +
    `<img src="data:image/png;base64,${source}">`,
  )
  await page.locator('img').evaluate((img) => img.decode())
  const target = resolve(publicDir, `icon-${size}.png`)
  await page.screenshot({ path: target })
  await page.close()
  console.log(`Wrote ${target} (${size}x${size})`)
}
await browser.close()
